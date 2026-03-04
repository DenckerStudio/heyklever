import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Get team folders
    const { data: folders, error } = await supabase
      .from("team_folders")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching team folders:", error);
      return NextResponse.json({ error: "Failed to fetch team folders" }, { status: 500 });
    }

    return NextResponse.json({ folders: folders || [] });

  } catch (error) {
    console.error("Error fetching team folders:", error);
    return NextResponse.json({ error: "Failed to fetch team folders" }, { status: 500 });
  }
}
