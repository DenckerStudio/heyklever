import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { getNextcloudConfig } from '@/lib/integrations/platform-integrations';

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

async function getTeamSlug(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	teamId: string
): Promise<string | null> {
	const { data } = await supabase
		.from('teams')
		.select('slug')
		.eq('id', teamId)
		.maybeSingle();
	return data?.slug ?? null;
}

/**
 * GET /api/integrations/nextcloud/collabora-url?path=...
 * Returns a URL to open the given Nextcloud file in Collabora (iframe). Path is relative to team base.
 * Uses Nextcloud OCS richdocuments API when available; otherwise returns a fallback view URL.
 */
export async function GET(req: NextRequest) {
	const user = await getServerUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const supabase = await createSupabaseServerClient();
	const teamId = await getTeamId(supabase, user.id);
	if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 });

	const { searchParams } = new URL(req.url);
	const pathParam = searchParams.get('path');
	if (!pathParam || pathParam.trim() === '') {
		return NextResponse.json({ error: 'path query required' }, { status: 400 });
	}

	const { data: settingsRow } = await supabase
		.from('team_settings')
		.select('settings')
		.eq('team_id', teamId)
		.maybeSingle();

	const nextcloud = await getNextcloudConfig(teamId, supabase, settingsRow?.settings as Record<string, unknown> | null);
	if (!nextcloud) {
		return NextResponse.json({ error: 'Nextcloud not configured' }, { status: 400 });
	}

	const teamSlug = await getTeamSlug(supabase, teamId);
	const basePath = (nextcloud.base_path ?? teamSlug ?? '').replace(/^\/+|\/+$/g, '');
	const pathSegments = pathParam.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
	const ncPath = basePath ? `/${basePath}/${pathSegments.join('/')}` : `/${pathSegments.join('/')}`;

	const auth = Buffer.from(`${nextcloud.username}:${nextcloud.app_password}`).toString('base64');
	const ocsUrl = `${nextcloud.url}/ocs/v2.php/apps/richdocuments/api/v1/documents?format=json&path=${encodeURIComponent(ncPath)}`;

	let res: Response;
	try {
		res = await fetch(ocsUrl, {
			method: 'GET',
			headers: {
				Authorization: `Basic ${auth}`,
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
			},
			cache: 'no-store',
		});
	} catch (e) {
		return NextResponse.json(
			{ error: 'Nextcloud unreachable', details: String(e) },
			{ status: 502 }
		);
	}

	if (res.ok) {
		const data = await res.json();
		const url = data?.ocs?.data?.url ?? data?.url;
		if (url && typeof url === 'string') {
			return NextResponse.json({ url });
		}
	}

	// Fallback: direct Nextcloud file URL (opens in Files app; user can "Open with Collabora" if available)
	const fallbackUrl = `${nextcloud.url}/apps/files/?dir=${encodeURIComponent(ncPath)}&openfile=1`;
	return NextResponse.json({ url: fallbackUrl, fallback: true });
}
