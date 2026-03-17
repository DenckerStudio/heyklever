import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { minioClient, ensureTeamBucket } from "@/lib/storage/minio";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "public"; // public | private
    const path = searchParams.get("path") || ""; // file/folder path
    const isFolder = searchParams.get("isFolder") === "true";

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
      .select("team_id, folder_id")
      .eq("team_id", teamId)
      .single();

    if (!teamFolder) {
      return NextResponse.json({ error: "Team folder not found" }, { status: 404 });
    }

    const bucket = await ensureTeamBucket(teamId);

    // Object key = path (relative to bucket root)
    const fullPath = path;
    
    if (!fullPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    
    console.log('Delete path construction:', {
      bucket,
      scope,
      path,
      fullPath,
      isFolder
    });

    // Delete from MinIO
    if (isFolder) {
      // For folders, we need to list all files in the folder first and delete them
      // Ensure folder path ends with /
      const prefix = fullPath.endsWith('/') ? fullPath : `${fullPath}/`;
      
      const stream = minioClient.listObjectsV2(bucket, prefix, true);
      const objectsList: string[] = [];
      
      await new Promise<void>((resolve, reject) => {
        stream.on('data', function(obj) {
          if (obj.name) objectsList.push(obj.name);
        });
        stream.on('error', function(err) {
          console.error("Error listing folder contents in MinIO:", err);
          reject(err);
        });
        stream.on('end', resolve);
      });

      if (objectsList.length > 0) {
        await minioClient.removeObjects(bucket, objectsList);
      }
    } else {
      // For files, delete directly
      await minioClient.removeObject(bucket, fullPath);
    }

    // Delete from documents table (filter by metadata.context)
    const { error: docDeleteError } = await supabaseServer
      .from("documents")
      .delete()
      .eq("team_id", teamId)
      .contains("metadata", { context: scope })
      .eq("object_path", fullPath);

    if (docDeleteError) {
      console.error("Error deleting document records:", docDeleteError);
      // Don't fail the entire operation if document deletion fails
      console.warn("Document deletion failed, but storage deletion succeeded");
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${isFolder ? 'folder' : 'file'}: ${path}` 
    });

  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

