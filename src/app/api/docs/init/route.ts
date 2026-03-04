import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(_req: NextRequest) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const { data: session } = await supabaseServer.auth.getUser();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID not found" }, { status: 400 });
    }

    // Initialize Admin Client for Storage Operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const admin = createClient(supabaseUrl, serviceKey);
    const bucket = "team-files";

    const userId = session.user.id;
    
    // Define paths to create
    // We use .keep files to "create" the folders
    const pathsToCreate = [
      `teams/${teamId}/Public/AI-Docs/.keep`,
      `teams/${teamId}/Private/AI-Docs/.keep`,
      `teams/${teamId}/members/${userId}/AI-Docs/.keep`
    ];

    const results = await Promise.all(
      pathsToCreate.map(async (path) => {
        const { error } = await admin.storage
          .from(bucket)
          .upload(path, new Blob([""], { type: "text/plain" }), {
            contentType: "text/plain",
            upsert: true 
          });
        return { path, error: error?.message };
      })
    );

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Errors creating folders:", errors);
      return NextResponse.json({ 
        error: "Some folders failed to create", 
        details: errors 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, paths: pathsToCreate });

  } catch (error) {
    console.error("Init Docs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

