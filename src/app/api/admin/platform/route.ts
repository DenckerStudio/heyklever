import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isAppAdmin } from "@/lib/admin";
import { isAdminTeam } from "@/lib/utils/subscription";

async function checkAdmin() {
  const user = await getServerUser();
  if (!user) return null;

  const isEmailAdmin = await isAppAdmin(user.email);
  if (isEmailAdmin) return user;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: membership } = await admin
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"]);

  if (membership) {
    for (const m of membership) {
      if (await isAdminTeam(m.team_id, admin)) return user;
    }
  }
  return null;
}

export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [teamsRes, profilesRes, membersRes, subsRes] = await Promise.all([
    admin.from("teams").select("id, name, slug, plan, created_at, logo_url"),
    admin.from("profiles").select("id, email, full_name, avatar_url, default_team_id, created_at"),
    admin.from("team_members").select("team_id, user_id, role, created_at"),
    admin.from("subscriptions").select("id, team_id, status, stripe_subscription_id, created_at"),
  ]);

  const teams = teamsRes.data || [];
  const profiles = profilesRes.data || [];
  const members = membersRes.data || [];
  const subscriptions = subsRes.data || [];

  const memberCountMap: Record<string, number> = {};
  for (const m of members) {
    memberCountMap[m.team_id] = (memberCountMap[m.team_id] || 0) + 1;
  }

  const subMap: Record<string, { status: string; id: string }> = {};
  for (const s of subscriptions) {
    if (!subMap[s.team_id] || s.status === "active") {
      subMap[s.team_id] = { status: s.status, id: s.id };
    }
  }

  const userTeamMap: Record<string, { teamId: string; teamName: string; role: string }[]> = {};
  for (const m of members) {
    if (!userTeamMap[m.user_id]) userTeamMap[m.user_id] = [];
    const team = teams.find((t) => t.id === m.team_id);
    userTeamMap[m.user_id].push({
      teamId: m.team_id,
      teamName: team?.name || "Unknown",
      role: m.role,
    });
  }

  return NextResponse.json({
    teams: teams.map((t) => ({
      ...t,
      memberCount: memberCountMap[t.id] || 0,
      subscription: subMap[t.id] || null,
    })),
    users: profiles.map((p) => ({
      ...p,
      teams: userTeamMap[p.id] || [],
    })),
    stats: {
      totalTeams: teams.length,
      totalUsers: profiles.length,
      activeSubscriptions: subscriptions.filter((s) => s.status === "active" || s.status === "trialing").length,
      totalSubscriptions: subscriptions.length,
    },
  });
}
