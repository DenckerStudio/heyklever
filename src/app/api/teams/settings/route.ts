import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// GET: Fetch team settings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const cookieTeamId = cookieStore.get("team_id")?.value || teamId;

    if (!cookieTeamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", cookieTeamId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "User is not a member of this team" }, { status: 403 });
    }

    // Get team settings
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", cookieTeamId)
      .single();

    if (teamError) {
      return NextResponse.json({ error: "Failed to fetch team settings" }, { status: 500 });
    }

    return NextResponse.json({ 
      settings: team.settings || {}
    });

  } catch (error) {
    console.error("Error fetching team settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update team settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings } = body;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Verify user is an admin of the team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "User is not a member of this team" }, { status: 403 });
    }

    // Check if user has admin permissions
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Only admins can update team settings" }, { status: 403 });
    }

    // Get current settings and merge with new settings
    const { data: currentTeam, error: fetchError } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", teamId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch current settings" }, { status: 500 });
    }

    const currentSettings = (currentTeam?.settings as Record<string, any>) || {};
    const updatedSettings = { ...currentSettings, ...settings };

    // Update team settings
    const { error: updateError } = await supabase
      .from("teams")
      .update({ 
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq("id", teamId);

    if (updateError) {
      console.error("Error updating team settings:", updateError);
      return NextResponse.json({ error: "Failed to update team settings" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      settings: updatedSettings
    });

  } catch (error) {
    console.error("Error updating team settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

