import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Generate a temporary path for the logo (we'll move it after team creation)
    const tempPath = `temp/${user.id}/${Date.now()}-${file.name}`;
    const ext = file.name.split(".").pop() || "png";
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "team-files";

    // Upload to temporary location in teams bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(tempPath, file, {
        contentType: file.type || `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Return temp path info - will be moved to final location after team creation
    return NextResponse.json({
      success: true,
      tempPath,
      bucket,
      ext,
    });

  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

