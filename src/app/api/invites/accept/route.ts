import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient, getServerUser } from "@/lib/supabase/server";
import { createMemberFolder } from "@/lib/storage/member-folders";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createSupabaseServerClient();
    const body = await req.json();
    const { token } = body as { token: string };
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    // Load invite by token and ensure not accepted
    const { data: invite, error: invErr } = await supabase
      .from("invites")
      .select("id, team_id, email, role, accepted_at")
      .eq("token", token)
      .maybeSingle();
    if (invErr || !invite) return NextResponse.json({ error: invErr?.message || "Invalid invite" }, { status: 404 });
    if (invite.accepted_at) return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });

    // Use service role to bypass RLS for atomic acceptance
    const { url, key } = createSupabaseServiceRoleClient();

    // Upsert membership and mark invite accepted
    // 1) Insert membership if not exists (using upsert to handle duplicates)
    const memberRes = await fetch(`${url}/rest/v1/team_members`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
      }),
    });
    if (!memberRes.ok) {
      console.error('Failed to add team member:', await memberRes.text());
    } else {
      // Create member folder in storage
      const folderRes = await createMemberFolder(invite.team_id, user.id);
      if (!folderRes.success) {
        console.error('Failed to create member folder:', folderRes.message);
        // Continue anyway
      }
    }

    // 2) Mark invite accepted
    const acceptedAt = new Date().toISOString();
    console.log(`Updating invite ${invite.id} with accepted_at: ${acceptedAt}`);
    
    const updateRes = await fetch(`${url}/rest/v1/invites?id=eq.${invite.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accepted_at: acceptedAt }),
    });
    
    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('Failed to update invite:', errorText);
      throw new Error(`Failed to update invite: ${errorText}`);
    } else {
      console.log(`Successfully updated invite ${invite.id}`);
    }

    // 3) Update user profile to mark as invited and set default team
    const profileRes = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        invited_user: true,
        default_team_id: invite.team_id,
        onboarding_completed: false
      }),
    });
    if (!profileRes.ok) {
      console.error('Failed to update profile:', await profileRes.text());
    }

    return NextResponse.json({ ok: true, teamId: invite.team_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


