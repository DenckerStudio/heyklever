import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { getSnipeItConfig } from '@/lib/integrations/platform-integrations';

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

/**
 * GET /api/integrations/snipe-it/assets
 * List hardware (assets) for the current team's company. Query: limit, offset, search.
 */
export async function GET(req: NextRequest) {
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
	if (!snipe) return NextResponse.json({ error: 'Snipe-IT not configured' }, { status: 400 });

	const { searchParams } = new URL(req.url);
	const limit = searchParams.get('limit') ?? '50';
	const offset = searchParams.get('offset') ?? '0';
	const search = searchParams.get('search') ?? '';

	const params = new URLSearchParams({ limit, offset });
	if (snipe.company_id != null) params.set('company_id', String(snipe.company_id));
	if (search) params.set('search', search);

	const res = await fetch(`${snipe.base_url}/api/v1/hardware?${params}`, {
		headers: { Accept: 'application/json', Authorization: `Bearer ${snipe.token}` },
		cache: 'no-store',
	});

	if (!res.ok) {
		const err = await res.text();
		return NextResponse.json({ error: 'Snipe-IT error', details: err.slice(0, 200) }, { status: res.status });
	}

	const data = await res.json();
	return NextResponse.json(data);
}

/**
 * POST /api/integrations/snipe-it/assets
 * Create a new asset (hardware). Body: Snipe-IT hardware payload; company_id is set from team if omitted.
 */
export async function POST(req: NextRequest) {
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
	if (!snipe) return NextResponse.json({ error: 'Snipe-IT not configured' }, { status: 400 });

	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (snipe.company_id != null && body.company_id == null) {
		body = { ...body, company_id: snipe.company_id };
	}

	const res = await fetch(`${snipe.base_url}/api/v1/hardware`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${snipe.token}`,
		},
		body: JSON.stringify(body),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		return NextResponse.json({ error: 'Snipe-IT error', ...data }, { status: res.status });
	}
	return NextResponse.json(data);
}
