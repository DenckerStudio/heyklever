import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { qdrantClient, qdrantCollection, ensureQdrantCollection } from "@/lib/qdrant/client";
import { v4 as uuidv4 } from "uuid";

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
                id: uuidv4(), // Generate ID for both Qdrant and potential future use
				team_id: teamId,
				folder_id: d.folderId ?? null,
				file_name: fileName,
				content: d.content ?? null,
				context,
				embedding: d.embedding ? (d.embedding as unknown as number[]) : null,
				metadata: d.metadata ?? {},
			};
		});

        const useQdrant = process.env.USE_QDRANT === 'true';

        if (useQdrant) {
            await ensureQdrantCollection();
            
            // Filter out items without embeddings as Qdrant requires them for the vector space
            const validPoints = rows
                .filter(row => row.embedding && row.embedding.length > 0)
                .map(row => ({
                    id: row.id,
                    vector: row.embedding!,
                    payload: {
                        team_id: row.team_id,
                        folder_id: row.folder_id,
                        file_name: row.file_name,
                        content: row.content,
                        context: row.context,
                        metadata: row.metadata
                    }
                }));

            if (validPoints.length > 0) {
                await qdrantClient.upsert(qdrantCollection, {
                    wait: true,
                    points: validPoints
                });
            }

            // Return same format as before
            const responseItems = rows.map(r => ({
                id: r.id,
                team_id: r.team_id,
                file_name: r.file_name,
                context: r.context
            }));

            return NextResponse.json({ 
                inserted: validPoints.length, 
                items: responseItems 
            }, { status: 200 });
        }

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


