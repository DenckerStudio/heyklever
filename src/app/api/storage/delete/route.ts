import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

    const { data: teamFolder } = await supabaseServer
      .from("team_folders")
      .select("team_id, provider, folder_id, public_folder_id, private_folder_id, storage_bucket")
      .eq("team_id", teamId)
      .eq("provider", "supabase_storage")
      .single();

    if (!teamFolder) {
      return NextResponse.json({ error: "Team folder not found" }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
    const admin = createClient(supabaseUrl, serviceKey);

    // Determine the folder path based on scope
    let baseFolderPath = scope === "public" ? teamFolder.public_folder_id : teamFolder.private_folder_id;
    
    // If scope-specific folder ID is null, construct the correct path
    if (!baseFolderPath) {
      const teamBasePath = teamFolder.folder_id || `teams/${teamId}`;
      baseFolderPath = `${teamBasePath}/${scope === "public" ? "Public" : "Private"}`;
    }
    
    // Ensure we're using the correct scope path
    if (!baseFolderPath.includes(scope === "public" ? "Public" : "Private")) {
      const teamBasePath = teamFolder.folder_id || `teams/${teamId}`;
      baseFolderPath = `${teamBasePath}/${scope === "public" ? "Public" : "Private"}`;
    }
    
    const fullPath = path ? `${baseFolderPath}/${path}` : baseFolderPath;
    
    console.log('Delete path construction:', {
      scope,
      baseFolderPath,
      path,
      fullPath,
      isFolder
    });

    // Delete from Supabase Storage
    if (isFolder) {
      // For folders, we need to list all files in the folder first and delete them
      const { data: files, error: listError } = await admin.storage
        .from(bucket)
        .list(fullPath, { limit: 1000, offset: 0 });
      
      if (listError) {
        console.error("Error listing folder contents:", listError);
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }

      // Delete all files in the folder
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${fullPath}/${file.name}`);
        const { error: deleteError } = await admin.storage
          .from(bucket)
          .remove(filePaths);
        
        if (deleteError) {
          console.error("Error deleting folder contents:", deleteError);
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }
    } else {
      // For files, delete directly
      const { error: deleteError } = await admin.storage
        .from(bucket)
        .remove([fullPath]);
      
      if (deleteError) {
        console.error("Error deleting file:", deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
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
