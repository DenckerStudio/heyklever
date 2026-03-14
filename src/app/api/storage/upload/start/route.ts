import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

    const { data: teamFolder, error: teamFolderError } = await supabaseServer
      .from("team_folders")
      .select("team_id, provider, folder_id, public_folder_id, private_folder_id, storage_bucket")
      .eq("team_id", teamId)
      .eq("provider", "supabase_storage")
      .single();

    console.log("Team folder query result:", { teamFolder, teamFolderError });

    if (!teamFolder) {
      console.log("No team folder found for team:", teamId);
      return NextResponse.json({ 
        error: "Team folder not found. Please create a team folder first.",
        teamId,
        details: "No Supabase Storage folder exists for this team"
      }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
    const admin = createClient(supabaseUrl, serviceKey);

    // Use team root folder directly (no longer using Public/Private subfolders)
    const baseFolderPath = teamFolder.folder_id || `teams/${teamId}`;
    
    const filePath = path ? `${baseFolderPath}/${path}/${fileName}` : `${baseFolderPath}/${fileName}`;
    
    console.log('Upload path construction:', {
      scope, // Scope is preserved for metadata, but not used for path construction
      baseFolderPath,
      path,
      fileName,
      finalPath: filePath
    });

    // Generate signed upload URL
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, {
        upsert: true, // Allow overwriting existing files
      });

    if (error) {
      console.error("Error creating signed upload URL:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      path: filePath,
      bucketId: bucket,
      token: data.token,
    });

  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
