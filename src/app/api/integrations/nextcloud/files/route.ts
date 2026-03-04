import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';

import { getNextcloudConfig } from '@/lib/integrations/platform-integrations';

/**
 * GET /api/integrations/nextcloud/files
 * Lists files from the team's Nextcloud instance (WebDAV), optionally under a path (group folder + subfolder).
 * Query: path (optional) – subfolder relative to team base (e.g. "" or "Documents").
 * Uses team_settings.settings.nextcloud if set, else platform_integrations (nextcloud).
 * Team base path: settings.nextcloud.base_path or team slug.
 */
export async function GET(req: NextRequest) {
	const user = await getServerUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const supabase = await createSupabaseServerClient();
	const teamId = await getTeamId(supabase, user.id);
	if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 });

	const { searchParams } = new URL(req.url);
	const pathParam = searchParams.get('path') ?? '';

	const { data: settingsRow } = await supabase
		.from('team_settings')
		.select('settings')
		.eq('team_id', teamId)
		.maybeSingle();

	const nextcloud = await getNextcloudConfig(teamId, supabase, settingsRow?.settings as Record<string, unknown> | null);
	if (!nextcloud) {
		return NextResponse.json({ files: [], folders: [], configured: false });
	}

	const teamSlug = await getTeamSlug(supabase, teamId);
	const basePath = (nextcloud.base_path ?? teamSlug ?? '').replace(/^\/+|\/+$/g, '');
	const pathSegments = pathParam.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
	const relativePath = basePath ? [basePath, ...pathSegments].join('/') : pathSegments.join('/');
	const davRoot = `${nextcloud.url}/remote.php/dav/files/${encodeURIComponent(nextcloud.username)}/`;
	const davPath = relativePath ? `${davRoot}${encodeURIComponent(relativePath).replace(/%2F/g, '/')}/` : davRoot;
	const auth = Buffer.from(`${nextcloud.username}:${nextcloud.app_password}`).toString('base64');

	const propfindBody = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:displayname/><d:getcontentlength/><d:getlastmodified/><d:resourcetype/></d:prop>
</d:propfind>`;

	let res: Response;
	try {
		res = await fetch(davPath, {
			method: 'PROPFIND',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/xml',
				Depth: '1',
			},
			body: propfindBody,
			cache: 'no-store',
		});
	} catch (e) {
		return NextResponse.json(
			{ error: 'Nextcloud unreachable', details: String(e) },
			{ status: 502 }
		);
	}

	if (!res.ok) {
		return NextResponse.json(
			{ error: 'Nextcloud error', status: res.status },
			{ status: 502 }
		);
	}

	const text = await res.text();
	const { files, folders } = parsePropfindResponse(text, davPath, pathParam);
	return NextResponse.json({ files, folders, configured: true });
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

interface FileItem {
	name: string;
	path: string;
	size: number;
	lastModified: string;
	type: 'file';
}
interface FolderItem {
	name: string;
	path: string;
	type: 'folder';
}

function parsePropfindResponse(
	xml: string,
	baseHref: string,
	requestPath: string
): { files: FileItem[]; folders: FolderItem[] } {
	const files: FileItem[] = [];
	const folders: FolderItem[] = [];
	const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/gi;
	let m: RegExpExecArray | null;
	while ((m = responseRegex.exec(xml)) !== null) {
		const block = m[1];
		const hrefMatch = /<d:href>([^<]*)<\/d:href>/i.exec(block);
		const href = hrefMatch ? decodeURIComponent(hrefMatch[1].trim()) : '';
		if (href === baseHref || href === baseHref.replace(/\/$/, '')) continue;
		const name = href.split('/').filter(Boolean).pop() ?? href;
		const isCollection = /<d:collection\s*\/?>/i.test(block);
		const sizeMatch = /<d:getcontentlength>(\d*)<\/d:getcontentlength>/i.exec(block);
		const size = sizeMatch ? parseInt(sizeMatch[1], 10) || 0 : 0;
		const lastModMatch = /<d:getlastmodified>([^<]*)<\/d:getlastmodified>/i.exec(block);
		const lastModified = lastModMatch ? lastModMatch[1].trim() : '';
		const relPath = requestPath ? `${requestPath.replace(/\/$/, '')}/${name}` : name;
		if (isCollection) {
			folders.push({ name, path: relPath, type: 'folder' });
		} else {
			files.push({ name, path: relPath, size, lastModified, type: 'file' });
		}
	}
	return { files, folders };
}
