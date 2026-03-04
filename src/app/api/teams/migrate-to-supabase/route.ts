import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(_req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "team-files";
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase env not configured" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ensure bucket exists (ignore if already exists)
    await admin.storage.createBucket(bucket, { public: false }).catch(() => {});

    // Get teams without supabase_storage entries
    const { data: teams, error: teamsError } = await admin.from("teams").select("id,name");
    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    const results: Array<{ teamId: string; ok: boolean; message?: string }> = [];

    for (const team of teams || []) {
      const basePath = `teams/${team.id}`;

      // Check if already migrated
      const { data: existing, error: existErr } = await admin
        .from("team_folders")
        .select("id")
        .eq("team_id", team.id)
        .eq("provider", "supabase_storage")
        .maybeSingle();

      if (existErr) {
        results.push({ teamId: team.id, ok: false, message: existErr.message });
        continue;
      }
      if (existing) {
        results.push({ teamId: team.id, ok: true, message: "already present" });
        continue;
      }

      // Create pseudo-folders
      const publicPath = `${basePath}/Public/.keep`;
      const privatePath = `${basePath}/Private/.keep`;
      await admin.storage.from(bucket).upload(publicPath, "", { upsert: true, contentType: "text/plain" }).catch(() => {});
      await admin.storage.from(bucket).upload(privatePath, "", { upsert: true, contentType: "text/plain" }).catch(() => {});

      // Namespaces
      const teamCode = (team.id as string).substring(0, 8).toUpperCase();
      const mainNamespace = `team_${teamCode}_main`;
      const publicNamespace = `team_${teamCode}_public`;
      const privateNamespace = `team_${teamCode}_private`;

      const { error: insertErr } = await admin
        .from("team_folders")
        .insert({
          team_id: team.id,
          provider: "supabase_storage",
          folder_id: basePath,
          folder_name: `${team.name} - Supabase`,
          folder_url: `supabase://${bucket}/${basePath}`,
          pinecone_namespace: mainNamespace,
          public_namespace: publicNamespace,
          private_namespace: privateNamespace,
          public_folder_id: `${basePath}/Public`,
          private_folder_id: `${basePath}/Private`,
        });

      if (insertErr) {
        results.push({ teamId: team.id, ok: false, message: insertErr.message });
      } else {
        results.push({ teamId: team.id, ok: true });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}


