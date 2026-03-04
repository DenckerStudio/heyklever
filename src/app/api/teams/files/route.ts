import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

interface TeamFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    visibility_scope?: string;
    allowed_client_codes?: string[];
  };
}

interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: FolderItem[];
  metadata?: TeamFile['metadata'];
}

/**
 * GET /api/teams/files
 * Lists all files and folders for the current team
 * Used by FileAccessSelector component for selecting files per client URL
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") || ""; // folder path to list
    const includeMetadata = searchParams.get("metadata") === "true";

    const supabaseServer = await createSupabaseServerClient();
    const { data: session } = await supabaseServer.auth.getUser();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value || "";

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Get team folder configuration
    const { data: teamFolder } = await supabaseServer
      .from("team_folders")
      .select("team_id, provider, folder_id, storage_bucket")
      .eq("team_id", teamId)
      .eq("provider", "supabase_storage")
      .single();

    if (!teamFolder) {
      return NextResponse.json({ files: [], folders: [] });
    }

    // Use service role for storage operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
    const admin = createClient(supabaseUrl, serviceKey);

    // Build the full path
    const basePrefix = teamFolder.folder_id || `teams/${teamId}`;
    const fullPrefix = path ? `${basePrefix}/${path}` : basePrefix;

    // List files in storage
    const { data: listed, error } = await admin.storage
      .from(bucket)
      .list(fullPrefix, { limit: 500, offset: 0 });

    if (error) {
      console.error("Error listing files:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to our file structure
    const files: TeamFile[] = [];
    const folders: FolderItem[] = [];

    for (const item of listed || []) {
      // Skip .emptyFolderPlaceholder files
      if (item.name === ".emptyFolderPlaceholder") continue;

      const itemPath = path ? `${path}/${item.name}` : item.name;
      const fullPath = `${basePrefix}/${itemPath}`;

      if (item.id === null) {
        // This is a folder
        folders.push({
          id: `folder-${itemPath}`,
          name: item.name,
          type: 'folder',
          path: itemPath,
        });
      } else {
        // This is a file
        const file: TeamFile = {
          id: item.id,
          name: item.name,
          path: itemPath,
          size: item.metadata?.size,
          mimeType: item.metadata?.mimetype,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };

        // If metadata is requested, try to get document metadata from the documents table
        if (includeMetadata) {
          const { data: docMetadata } = await supabaseServer
            .from("documents")
            .select("metadata")
            .eq("metadata->>'file_id'", item.id)
            .limit(1)
            .single();

          if (docMetadata?.metadata) {
            file.metadata = {
              visibility_scope: docMetadata.metadata.visibility_scope,
              allowed_client_codes: docMetadata.metadata.allowed_client_codes,
            };
          }
        }

        files.push(file);
      }
    }

    return NextResponse.json({
      files,
      folders,
      path: fullPrefix,
      total: files.length + folders.length,
    });

  } catch (error) {
    console.error("Error listing team files:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/teams/files/search
 * Search for files by name
 */
export async function POST(req: NextRequest) {
  try {
    const { query, limit = 50 } = await req.json();

    const supabaseServer = await createSupabaseServerClient();
    const { data: session } = await supabaseServer.auth.getUser();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value || "";

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Search query required" }, { status: 400 });
    }

    // Search documents by file name in metadata
    // This searches the documents table which contains embedded chunks with file metadata
    const { data: documents, error } = await supabaseServer
      .from("documents")
      .select("id, metadata")
      .eq("metadata->>'team_id'", teamId)
      .ilike("metadata->>'file_name'", `%${query}%`)
      .limit(limit);

    if (error) {
      console.error("Error searching documents:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate by file_id to get unique files
    const uniqueFiles = new Map<string, TeamFile>();
    
    for (const doc of documents || []) {
      const fileId = doc.metadata?.file_id;
      if (fileId && !uniqueFiles.has(fileId)) {
        uniqueFiles.set(fileId, {
          id: fileId,
          name: doc.metadata?.file_name || "Unknown",
          path: doc.metadata?.object_path || "",
          metadata: {
            visibility_scope: doc.metadata?.visibility_scope,
            allowed_client_codes: doc.metadata?.allowed_client_codes,
          },
        });
      }
    }

    return NextResponse.json({
      files: Array.from(uniqueFiles.values()),
      total: uniqueFiles.size,
      query,
    });

  } catch (error) {
    console.error("Error searching team files:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
