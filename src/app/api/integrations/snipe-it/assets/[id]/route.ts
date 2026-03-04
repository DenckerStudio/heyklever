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
 * GET /api/integrations/snipe-it/assets/[id]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

	const { id } = await params;
	const res = await fetch(`${snipe.base_url}/api/v1/hardware/${id}`, {
		headers: { Accept: 'application/json', Authorization: `Bearer ${snipe.token}` },
		cache: 'no-store',
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) return NextResponse.json({ error: 'Snipe-IT error', ...data }, { status: res.status });
	return NextResponse.json(data);
}

/**
 * PATCH /api/integrations/snipe-it/assets/[id]
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

	const { id } = await params;
	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const res = await fetch(`${snipe.base_url}/api/v1/hardware/${id}`, {
		method: 'PATCH',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${snipe.token}`,
		},
		body: JSON.stringify(body),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) return NextResponse.json({ error: 'Snipe-IT error', ...data }, { status: res.status });
	return NextResponse.json(data);
}

/**
 * DELETE /api/integrations/snipe-it/assets/[id]
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

	const { id } = await params;
	const res = await fetch(`${snipe.base_url}/api/v1/hardware/${id}`, {
		method: 'DELETE',
		headers: { Accept: 'application/json', Authorization: `Bearer ${snipe.token}` },
	});

	if (res.status === 204 || res.ok) return NextResponse.json({ ok: true });
	const data = await res.json().catch(() => ({}));
	return NextResponse.json({ error: 'Snipe-IT error', ...data }, { status: res.status });
}
