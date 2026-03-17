import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { minioClient, ensureTeamBucket } from "@/lib/storage/minio";

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

  if (!teamId) {
    return new Response("No team context", { status: 400 });
  }

  const { data: teamFolder } = await supabaseServer
    .from("team_folders")
    .select("team_id, folder_id, storage_bucket")
    .eq("team_id", teamId)
    .single();

  if (!teamFolder) {
    return new Response("Not found", { status: 404 });
  }

  // Ensure bucket exists dynamically
  const bucket = await ensureTeamBucket(teamId);

  // Object key = path (relative to bucket root)
  let fullPath = path || "";
  if (!fullPath) {
    return new Response("path is required", { status: 400 });
  }
  const baseFolderPath = ""; // listing fallback uses bucket root
  let dataStream: any = null;
  let fileError: any = null;

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

  try {
    // First try to download directly
    dataStream = await minioClient.getObject(bucket, fullPath);
  } catch (error) {
    // If direct download fails and path looks like just a filename, search for it
    if (!path.includes("/")) {
      try {
        const objectsStream = minioClient.listObjectsV2(bucket, baseFolderPath, true);
        const foundPath = await new Promise<string | null>((resolve, reject) => {
          objectsStream.on('data', (obj) => {
            if (obj.name && obj.name.endsWith(`/${path}`)) {
              resolve(obj.name);
            }
          });
          objectsStream.on('error', reject);
          objectsStream.on('end', () => resolve(null));
        });

        if (foundPath) {
          fullPath = foundPath;
          dataStream = await minioClient.getObject(bucket, fullPath);
        } else {
          fileError = new Error("File not found in MinIO");
        }
      } catch (searchError) {
        fileError = searchError;
      }
    } else {
      fileError = error;
    }
  }

  if (fileError || !dataStream) {
    return new Response(fileError?.message || "Download failed", { status: 404 });
  }

  // Convert MinIO stream to Web ReadableStream
  const readableStream = new ReadableStream({
    start(controller) {
      dataStream.on('data', (chunk: any) => controller.enqueue(chunk));
      dataStream.on('end', () => controller.close());
      dataStream.on('error', (err: any) => controller.error(err));
    }
  });

  return new Response(readableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}


