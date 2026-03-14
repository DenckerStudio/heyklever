import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

    const { data: teamFolder } = await supabaseServer
      .from("team_folders")
      .select("team_id, provider, folder_id, public_folder_id, private_folder_id, storage_bucket")
      .eq("team_id", teamId)
      .eq("provider", "supabase_storage")
      .single();

    if (!teamFolder) {
      return NextResponse.json({ files: [] });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
    const admin = createClient(supabaseUrl, serviceKey);

    let basePrefix;

    if (scope === "members") {
      basePrefix = `teams/${teamId}/Members/${session.user.id}`;
    } else {
      // Use team root folder directly (no longer using Public/Private subfolders)
      basePrefix = teamFolder.folder_id || `teams/${teamId}`;
    }
    
    const fullPrefix = path ? `${basePrefix}/${path}` : basePrefix;
    
    console.log('List path construction:', {
      scope,
      basePrefix,
      path,
      fullPrefix
    });
    const { data: listed, error } = await admin.storage.from(bucket).list(fullPrefix, { limit: 100, offset: 0 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prefix: fullPrefix, files: listed || [] });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// team id derived from cookie in this endpoint


