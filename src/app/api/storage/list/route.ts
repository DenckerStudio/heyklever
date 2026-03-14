import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { minioClient, ensureTeamBucket } from "@/lib/storage/minio";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "public"; // public | private
    const path = searchParams.get("path") || ""; // folder path

    const supabaseServer = await createSupabaseServerClient();
    const { data: session } = await supabaseServer.auth.getUser();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value || "";

    if (!teamId) {
      return NextResponse.json({ error: "No team context" }, { status: 400 });
    }

    const { data: teamFolder } = await supabaseServer
      .from("team_folders")
      .select("team_id, folder_id, storage_bucket")
      .eq("team_id", teamId)
      .single();

    if (!teamFolder) {
      return NextResponse.json({ files: [] });
    }

    const bucket = await ensureTeamBucket(teamId);

    // List under bucket root; optional prefix for "members" or path
    let basePrefix = scope === "members" ? `Members/${session.user.id}` : "";
    let fullPrefix = path ? (basePrefix ? `${basePrefix}/${path}` : path) : basePrefix;
    if (fullPrefix && !fullPrefix.endsWith('/')) {
      fullPrefix += '/';
    }
    
    console.log('List path construction:', {
      bucket,
      scope,
      basePrefix,
      path,
      fullPrefix
    });

    // List objects in MinIO
    // minioClient.listObjectsV2(bucketName, prefix, recursive)
    // For a folder view, we don't want recursive. We want just the top level items in that prefix.
    const stream = minioClient.listObjectsV2(bucket, fullPrefix, false);
    
    const listed: any[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (obj) => {
        // Map MinIO object format to match what Supabase returned
        // Supabase returns { name, id, updated_at, created_at, last_accessed_at, metadata: { size, mimetype } }
        // MinIO returns { name, prefix (if folder), size, lastModified, etag }
        
        // Remove the prefix from the name for the frontend
        let itemName = obj.prefix || obj.name || "";
        if (itemName.startsWith(fullPrefix)) {
          itemName = itemName.substring(fullPrefix.length);
        }
        // Remove trailing slash if it's a folder
        if (itemName.endsWith('/')) {
          itemName = itemName.substring(0, itemName.length - 1);
        }

        if (itemName && itemName !== '.keep') {
          listed.push({
            name: itemName,
            id: obj.etag || obj.prefix || itemName,
            updated_at: obj.lastModified || new Date().toISOString(),
            created_at: obj.lastModified || new Date().toISOString(),
            metadata: {
              size: obj.size || 0,
              mimetype: obj.prefix ? null : "application/octet-stream" // Can't easily know mimetype without stat, but frontend usually guesses from extension
            }
          });
        }
      });
      stream.on('error', reject);
      stream.on('end', () => resolve());
    });

    return NextResponse.json({ prefix: fullPrefix, files: listed });

  } catch (error) {
    console.error("List API error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// team id derived from cookie in this endpoint


