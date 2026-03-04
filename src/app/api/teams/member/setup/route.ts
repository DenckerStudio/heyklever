import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMemberFolder } from "@/lib/storage/member-folders";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Verify user is a member of the team
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });
    }

    // Create member folder
    const result = await createMemberFolder(teamId, user.id);

    if (!result.success) {
      console.error("Failed to create member folder:", result.message);
      // Don't fail the request, as the user is already set up mostly
      return NextResponse.json({ success: false, message: result.message });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting up member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

