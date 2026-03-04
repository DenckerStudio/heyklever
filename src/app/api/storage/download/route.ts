import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "public";
  const path = searchParams.get("path") || "";

  const supabaseServer = await createSupabaseServerClient();
  const { data: session } = await supabaseServer.auth.getUser();
  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value || "";

  const { data: teamFolder } = await supabaseServer
    .from("team_folders")
    .select("team_id, provider, folder_id, public_folder_id, private_folder_id, storage_bucket")
    .eq("team_id", teamId)
    .eq("provider", "supabase_storage")
    .single();

  if (!teamFolder) {
    return new Response("Not found", { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
  const admin = createClient(supabaseUrl, serviceKey);

  // Use team root folder directly (no longer using Public/Private subfolders)
  const baseFolderPath = teamFolder.folder_id || `teams/${teamId}`;

  // Try to download the file
  let fullPath = `${baseFolderPath}/${path}`;
  let { data, error } = await admin.storage.from(bucket).download(fullPath);
  
  // If download fails and path looks like just a filename, search for it
  if (error && !path.includes("/")) {
    const fileName = path;
    
    // Search for file by listing all items with the filename
    // Try direct search first, then recursive search if needed
    const searchFileByName = async (folder: string, targetName: string): Promise<string | null> => {
      try {
        const { data: items, error: listError } = await admin.storage.from(bucket).list(folder, {
          limit: 1000,
          offset: 0,
        });
        
        if (listError || !items) return null;
        
        // First, check direct matches
        for (const item of items) {
          if (item.name === targetName) {
            const itemPath = folder ? `${folder}/${item.name}` : item.name;
            // Verify it's actually a file by trying to download
            const test = await admin.storage.from(bucket).download(itemPath);
            if (!test.error && test.data) {
              return itemPath;
            }
          }
        }
        
        // Then search in subdirectories (items without extensions or with /)
        for (const item of items) {
          // Skip if it has an extension (likely a file, not a folder)
          if (item.name.includes(".") && !item.name.endsWith("/")) {
            continue;
          }
          
          const itemPath = folder ? `${folder}/${item.name}` : item.name;
          const found = await searchFileByName(itemPath, targetName);
          if (found) return found;
        }
      } catch (err) {
        console.error("Error searching for file:", err);
      }
      
      return null;
    };
    
    const foundPath = await searchFileByName(baseFolderPath, fileName);
    if (foundPath) {
      fullPath = foundPath;
      const result = await admin.storage.from(bucket).download(fullPath);
      data = result.data;
      error = result.error;
    }
  }
  
  if (error || !data) {
    return new Response(error?.message || "Download failed", { status: 500 });
  }

  // Determine content type based on file extension
  const fileName = path.split("/").pop() || "file";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  let contentType = "application/octet-stream";
  let disposition = "inline"; // Default to inline for viewing in browser
  
  if (ext === "pdf") {
    contentType = "application/pdf";
  } else if (ext === "png") {
    contentType = "image/png";
  } else if (ext === "jpg" || ext === "jpeg") {
    contentType = "image/jpeg";
  } else if (ext === "gif") {
    contentType = "image/gif";
  } else if (ext === "txt") {
    contentType = "text/plain";
  } else if (ext === "html") {
    contentType = "text/html";
  }

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}


