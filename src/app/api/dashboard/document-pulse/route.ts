import { NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/document-pulse
 * Returns recent documents (grouped by file) and indexing status for the current team.
 * Used by the Document Pulse dashboard widget.
 */
export async function GET() {
	const user = await getServerUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const supabase = await createSupabaseServerClient();
	const teamId = (await getTeamId(supabase, user.id)) as string | null;
	if (!teamId) return NextResponse.json({ error: 'No team' }, { status: 400 });

	// RLS on documents allows select when (metadata->>'team_id')::uuid in team_members.
	const { data: rows, error } = await supabase
		.from('documents')
		.select('id, content, metadata, created_at')
		.eq('metadata->>team_id', teamId)
		.order('id', { ascending: false })
		.limit(500);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	// Group by file_id or file_name for "recent files" view
	const byFile = new Map<
		string,
		{ file_id: string; file_name: string; chunks: number; last_indexed_at: string }
	>();
	for (const r of rows ?? []) {
		const meta = (r.metadata as Record<string, unknown>) ?? {};
		const fileId = (meta.file_id as string) ?? (meta.file_name as string) ?? 'unknown';
		const fileName = (meta.file_name as string) ?? fileId;
		const existing = byFile.get(fileId);
		const updated =
			(typeof meta.updated_at === 'string' ? meta.updated_at : null) ??
			(typeof r.created_at === 'string' ? r.created_at : null) ??
			'';
		if (!existing) {
			byFile.set(fileId, { file_id: fileId, file_name: fileName, chunks: 1, last_indexed_at: updated });
		} else {
			existing.chunks += 1;
			if (updated && (!existing.last_indexed_at || updated > existing.last_indexed_at))
				existing.last_indexed_at = updated;
		}
	}

	const recentFiles = Array.from(byFile.values())
		.sort((a, b) => (b.last_indexed_at > a.last_indexed_at ? 1 : -1))
		.slice(0, 20);

	return NextResponse.json({
		recentFiles,
		totalChunks: rows?.length ?? 0,
	});
}

async function getTeamId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string): Promise<string | null> {
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
