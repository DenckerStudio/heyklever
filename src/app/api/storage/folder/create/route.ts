import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { scope = "public", path = "", folderName } = await req.json();
    if (!folderName || typeof folderName !== "string") {
      return NextResponse.json({ error: "folderName is required" }, { status: 400 });
    }

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

    let baseFolderPath;

    if (scope === "members") {
      // Member-specific folder: teams/{teamId}/Members/{userId}
      baseFolderPath = `teams/${teamId}/Members/${session.user.id}`;
    } else {
      // Use team root folder directly (no longer using Public/Private subfolders)
      baseFolderPath = teamFolder.folder_id || `teams/${teamId}`;
    }

    const folderPath = [baseFolderPath, path, folderName].filter(Boolean).join("/");
    const keepPath = `${folderPath}/.keep`;

    const emptyBlob = new Blob([""] as unknown as BlobPart[], { type: "text/plain" });
    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(keepPath, emptyBlob, { contentType: "text/plain", upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, folderPath });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}


