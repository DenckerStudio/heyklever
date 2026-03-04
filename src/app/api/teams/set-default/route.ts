import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "User is not a member of this team" }, { status: 403 });
    }

    // Update the user's default team
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        default_team_id: teamId,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating default team:", updateError);
      return NextResponse.json({ error: "Failed to set default team" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Default team updated successfully" 
    });

  } catch (error) {
    console.error("Error setting default team:", error);
    return NextResponse.json({ error: "Failed to set default team" }, { status: 500 });
  }
}
