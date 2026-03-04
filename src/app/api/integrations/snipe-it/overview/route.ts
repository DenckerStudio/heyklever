import { NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { getSnipeItConfig } from '@/lib/integrations/platform-integrations';

/**
 * GET /api/integrations/snipe-it/overview
 * Proxies to Snipe-IT API for hardware, users, licenses summary.
 * Uses team_settings.settings.snipe_it if set, else platform_integrations (snipe_it).
 */
export async function GET() {
	const user = await getServerUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const supabase = await createSupabaseServerClient();
	const teamId = await getTeamId(supabase, user.id);
	if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 });

	const { data: settingsRow } = await supabase
		.from('team_settings')
		.select('settings')
		.eq('team_id', teamId)
		.maybeSingle();

	const snipe = await getSnipeItConfig(teamId, supabase, settingsRow?.settings as Record<string, unknown> | null);
	if (!snipe) {
		return NextResponse.json({ configured: false, hardware: [], users: [], licenses: [], activity: [] });
	}

	const base = snipe.base_url;
	const headers: Record<string, string> = {
		Accept: 'application/json',
		Authorization: `Bearer ${snipe.token}`,
	};

	const hwUrl = snipe.company_id != null
		? `${base}/api/v1/hardware?limit=100&company_id=${snipe.company_id}`
		: `${base}/api/v1/hardware?limit=100`;

	const [hwRes, usersRes, licRes, actRes] = await Promise.all([
		fetch(hwUrl, { headers, cache: 'no-store' }),
		fetch(`${base}/api/v1/users?limit=100`, { headers, cache: 'no-store' }),
		fetch(`${base}/api/v1/licenses?limit=100`, { headers, cache: 'no-store' }),
		fetch(`${base}/api/v1/reports/activity?limit=20`, { headers, cache: 'no-store' }),
	]);

	const hwJson = hwRes.ok ? await hwRes.json() : { rows: [], total: 0 };
	const hardware = hwJson.rows ?? [];
	const total = hwJson.total ?? hardware.length;
	const users = usersRes.ok ? (await usersRes.json()).rows ?? [] : [];
	const licenses = licRes.ok ? (await licRes.json()).rows ?? [] : [];
	const activity = actRes.ok ? (await actRes.json()).rows ?? [] : [];
	const lowLicenses = licenses.filter((l: { seats?: number; remaining_seats?: number }) =>
		typeof l.remaining_seats === 'number' && typeof l.seats === 'number' && l.seats > 0 && l.remaining_seats / l.seats < 0.2
	);

	return NextResponse.json({
		configured: true,
		summary: {
			hardwareTotal: total,
			usersCount: users.length,
			licensesCount: licenses.length,
			lowLicensesCount: lowLicenses.length,
		},
		hardware: hardware.slice(0, 10),
		users: users.slice(0, 10),
		licenses: licenses.slice(0, 10),
		activity: activity.slice(0, 10),
	});
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
