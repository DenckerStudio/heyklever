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
 * POST /api/integrations/nextcloud/upload
 * Uploads a file to the team's Nextcloud (WebDAV) base path, then triggers ingest for embeddings.
 * Body: multipart/form-data with "file" (File) and optional "path" (string, subfolder).
 */
export async function POST(req: NextRequest) {
	const user = await getServerUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const supabase = await createSupabaseServerClient();
	const teamId = await getTeamId(supabase, user.id);
	if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 });

	const formData = await req.formData();
	const file = formData.get('file') as File | null;
	const pathParam = (formData.get('path') as string) ?? '';

	if (!file || !(file instanceof File)) {
		return NextResponse.json({ error: 'Missing or invalid file' }, { status: 400 });
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
	const relativeDir = basePath ? [basePath, ...pathSegments].join('/') : pathSegments.join('/');
	const fileName = file.name.replace(/[/\\]/g, '_');
	const davRoot = `${nextcloud.url}/remote.php/dav/files/${encodeURIComponent(nextcloud.username)}/`;
	const putPath = relativeDir
		? `${davRoot}${encodeURIComponent(relativeDir).replace(/%2F/g, '/')}/${encodeURIComponent(fileName)}`
		: `${davRoot}${encodeURIComponent(fileName)}`;
	const auth = Buffer.from(`${nextcloud.username}:${nextcloud.app_password}`).toString('base64');

	const bytes = await file.arrayBuffer();
	let putRes: Response;
	try {
		putRes = await fetch(putPath, {
			method: 'PUT',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': file.type || 'application/octet-stream',
			},
			body: bytes,
		});
	} catch (e) {
		return NextResponse.json(
			{ error: 'Nextcloud unreachable', details: String(e) },
			{ status: 502 }
		);
	}

	if (!putRes.ok) {
		const errText = await putRes.text();
		return NextResponse.json(
			{ error: 'Nextcloud upload failed', status: putRes.status, details: errText.slice(0, 200) },
			{ status: 502 }
		);
	}

	const nextcloudFilePath = relativeDir ? `${relativeDir}/${fileName}` : fileName;

	// Fire-and-forget: trigger n8n ingest webhook for Nextcloud file (embeddings in Supabase)
	const webhookUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL || process.env.N8N_INGEST_WEBHOOK_URL;
	if (webhookUrl) {
		fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				source: 'nextcloud',
				nextcloudFilePath,
				fileName,
				teamId,
				fileId: nextcloudFilePath,
				timestamp: new Date().toISOString(),
			}),
		}).catch((e) => console.error('Nextcloud ingest webhook failed:', e));
	}

	return NextResponse.json({
		ok: true,
		path: nextcloudFilePath,
		fileName,
	});
}
