import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type IncomingDoc = {
	teamId: string;
	folderId?: string | null;
	fileName: string;
	content?: string | null;
	context?: 'public' | 'private';
	embedding?: number[] | null; // optional; if omitted, we index FTS only
	metadata?: Record<string, unknown> | null;
};

export async function POST(req: NextRequest) {
	try {
		const raw = await req.json();
		const items: IncomingDoc[] = Array.isArray(raw) ? raw : [raw];

		if (!items.length) {
			return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
		}

		// Basic validation and normalization
		const rows = items.map((d) => {
			const teamId = (d.teamId ?? '').toString();
			if (!teamId) throw new Error('teamId is required for all documents');
			const fileName = (d.fileName ?? '').toString();
			if (!fileName) throw new Error('fileName is required for all documents');

			const context = ((d.context ?? 'private') === 'public') ? 'public' : 'private';
			return {
				team_id: teamId,
				folder_id: d.folderId ?? null,
				file_name: fileName,
				content: d.content ?? null,
				context,
				embedding: d.embedding ? (d.embedding as unknown as number[]) : null,
				metadata: d.metadata ?? {},
			};
		});

		const supabase = await createSupabaseServerClient();
		const { data, error } = await supabase
			.from('documents')
			.insert(rows)
			.select('id, team_id, file_name, context');

		if (error) {
			console.error('documents insert error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ inserted: data?.length ?? 0, items: data }, { status: 200 });
	} catch (err) {
		console.error('Index documents error:', err);
		return NextResponse.json({ error: 'Failed to index documents' }, { status: 500 });
	}
}


