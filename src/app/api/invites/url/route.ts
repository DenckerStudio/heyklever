import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { buildInviteUrl } from "@/lib/email";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get("id");
  if (!inviteId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Load invite with team context (RLS ensures membership)
  const { data: invite, error } = await supabase
    .from("invites")
    .select("id, team_id, token")
    .eq("id", inviteId)
    .single();
  if (error || !invite) return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });

  // Ensure requester is a team member
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", invite.team_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ data: team }, { data: settings }, { data: subs }] = await Promise.all([
    supabase.from("teams").select("name").eq("id", invite.team_id).single(),
    supabase.from("team_settings").select("custom_domain").eq("team_id", invite.team_id).maybeSingle(),
    supabase.from("subscriptions").select("status").eq("team_id", invite.team_id),
  ]);

  const hasActiveSub = Array.isArray(subs) && subs.some((s: any) => ["active", "trialing"].includes((s.status || "").toLowerCase()));
  const inviteUrl = buildInviteUrl({ teamId: invite.team_id, teamName: team?.name || "Team", email: "invitee@example.com", customDomain: hasActiveSub ? settings?.custom_domain || null : null });
  return NextResponse.json({ inviteUrl });
}
