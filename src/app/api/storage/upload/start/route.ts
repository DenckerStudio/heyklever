import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { minioClient, ensureTeamBucket } from "@/lib/storage/minio";

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileSize, contentType, scope = "public", path = "" } = await req.json();

    console.log("Upload request:", { fileName, fileSize, contentType, scope, path });

    if (!fileName || !fileSize || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseServer = await createSupabaseServerClient();
    const { data: session } = await supabaseServer.auth.getUser();
    if (!session.user) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value || "";
    console.log("Team ID from cookie:", teamId);
    if (!teamId) {
      return NextResponse.json({ error: "No team context" }, { status: 400 });
    }

    const { data: teamFolder, error: teamFolderError } = await supabaseServer
      .from("team_folders")
      .select("team_id, folder_id, storage_bucket")
      .eq("team_id", teamId)
      .single();

    if (teamFolderError && teamFolderError.code !== "PGRST116") {
      console.error("Error fetching team folders:", teamFolderError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!teamFolder) {
      console.log("No team folder found for team:", teamId);
      return NextResponse.json({ 
        error: "Team folder not found. Please create a team folder first.",
        teamId,
        details: "No folder exists for this team"
      }, { status: 404 });
    }

    // Ensure bucket exists dynamically
    const bucket = await ensureTeamBucket(teamId);

    // Files live directly in bucket root: object key = path/fileName or fileName
    const filePath = path ? `${path}/${fileName}`.replace(/^\/+/, "") : fileName;
    
    console.log('Upload path construction:', {
      bucket,
      scope,
      path,
      fileName,
      finalPath: filePath
    });

    try {
      // Generate pre-signed URL for PUT operation (expiry 15 minutes = 900 seconds)
      const presignedUrl = await minioClient.presignedPutObject(bucket, filePath, 900);
      
      return NextResponse.json({
        uploadUrl: presignedUrl,
        path: filePath,
        bucketId: bucket,
        token: "minio-direct", // Token not needed for MinIO presigned URLs
      });
    } catch (err) {
      console.error("Error generating MinIO presigned URL:", err);
      return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }

  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

