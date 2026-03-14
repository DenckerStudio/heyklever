import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { scope = "public", path = "", newName } = await req.json();
    if (!path || !newName) {
      return NextResponse.json({ error: "path and newName are required" }, { status: 400 });
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

    let baseFolderPath = scope === "public" ? teamFolder.public_folder_id : teamFolder.private_folder_id;
    if (!baseFolderPath) {
      const teamBasePath = teamFolder.folder_id || `teams/${teamId}`;
      baseFolderPath = `${teamBasePath}/${scope === "public" ? "Public" : "Private"}`;
    }
    if (!baseFolderPath.includes(scope === "public" ? "Public" : "Private")) {
      const teamBasePath = teamFolder.folder_id || `teams/${teamId}`;
      baseFolderPath = `${teamBasePath}/${scope === "public" ? "Public" : "Private"}`;
    }

    const oldFullPath = `${baseFolderPath}/${path}`;
    const parent = oldFullPath.split("/").slice(0, -1).join("/");
    const newFullPath = `${parent}/${newName}`;

    // Supabase Storage lacks rename; copy then delete
    const { error: copyError } = await admin.storage.from(bucket).copy(oldFullPath, newFullPath);
    if (copyError) {
      return NextResponse.json({ error: copyError.message }, { status: 500 });
    }

    const { error: deleteError } = await admin.storage.from(bucket).remove([oldFullPath]);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: newFullPath });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}


