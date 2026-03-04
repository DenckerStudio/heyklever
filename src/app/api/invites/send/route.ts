import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient, getServerUser } from "@/lib/supabase/server";
import { buildInviteUrl, sendTeamInviteEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createSupabaseServerClient();

    const body = await req.json();
    const { teamId, email, role } = body as { teamId: string; email: string; role: string };
    if (!teamId || !email) return NextResponse.json({ error: "Missing teamId or email" }, { status: 400 });

    // Ensure requester is team admin/owner
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();
    const memberRole = (membership as { role?: string } | null)?.role || "";
    if (!membership || !["owner", "admin"].includes(memberRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create invite with token
    const token = crypto.randomUUID();
    const { data: inserted, error: insertError } = await supabase
      .from("invites")
      .insert({ team_id: teamId, email, role: role || "member", token })
      .select("id, team_id, token")
      .single();
    if (insertError || !inserted) return NextResponse.json({ error: insertError?.message || "Failed to create invite" }, { status: 400 });

    // Load team name and settings for URL
    const [{ data: team }, { data: settings }, { data: subs }, { data: inviter }] = await Promise.all([
      supabase.from("teams").select("name").eq("id", teamId).single(),
      supabase.from("team_settings").select("custom_domain").eq("team_id", teamId).maybeSingle(),
      supabase.from("subscriptions").select("status").eq("team_id", teamId),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);

    type SubscriptionRow = { status: string | null };
    const hasActiveSub = Array.isArray(subs) && (subs as SubscriptionRow[]).some((s) => ["active", "trialing"].includes((s.status || "").toLowerCase()));
    // Determine if the invited email already has an account
    const { url: adminUrl, key: serviceKey } = createSupabaseServiceRoleClient();
    const profileRes = await fetch(`${adminUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    const existingProfiles = profileRes.ok ? await profileRes.json() : [];
    const isRegistered = Array.isArray(existingProfiles) && existingProfiles.length > 0;

    // Build URL depending on registration state
    let inviteUrl: string;
    if (isRegistered) {
      // Existing user: send them to dashboard with invite token to confirm join
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const base = (hasActiveSub && settings?.custom_domain)
        ? `https://${settings.custom_domain}`
        : siteUrl;
      const url = new URL("/dashboard", base);
      url.searchParams.set("inviteToken", inserted.token);
      url.searchParams.set("team", teamId);
      if (team?.name) url.searchParams.set("teamName", team.name);
      inviteUrl = url.toString();
    } else {
      // New user: send onboarding invite link
      inviteUrl = buildInviteUrl({ 
        teamId, 
        teamName: team?.name || "Team", 
        email,
        customDomain: hasActiveSub ? settings?.custom_domain || null : null 
      });
    }

    // Send email (different template for existing user)
    const { emailId } = await sendTeamInviteEmail({
      to: email,
      teamName: team?.name || "Team",
      inviterName: inviter?.full_name || "A teammate",
      inviteUrl,
      logoUrl: null,
      existingUser: isRegistered,
    });

    return NextResponse.json({ id: inserted.id, inviteUrl, emailId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


