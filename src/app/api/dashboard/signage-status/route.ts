import { NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/signage-status
 * Returns digital signage players and status for the current team.
 */
export async function GET() {
	const user = await getServerUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const supabase = await createSupabaseServerClient();
	const teamId = await getTeamId(supabase, user.id);
	if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 });

	const { data: players, error } = await supabase
		.from('signage_players')
		.select('id, type, name, endpoint, status, last_seen_at')
		.eq('team_id', teamId)
		.order('name');

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ players: players ?? [] });
}

async function getTeamId(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	userId: string
): Promise<string | null> {
	const { data: profile } = await supabase
		.from('profiles')
		.select('default_team_id')
		.eq('id', userId)
		.maybeSingle();
	if (profile?.default_team_id) return profile.default_team_id;
	const { data: member } = await supabase
		.from('team_members')
		.select('team_id')
		.eq('user_id', userId)
		.limit(1)
		.maybeSingle();
	return member?.team_id ?? null;
}
