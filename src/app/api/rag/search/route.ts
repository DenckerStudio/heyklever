import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Be robust to n8n sending arrays or nested { body: {...} }
    const raw = await req.json();
    const first = Array.isArray(raw) ? (raw[0] ?? {}) : raw;
    const payload = typeof first.body === 'object' && first.body !== null ? first.body : first;

    const query = (payload.query ?? payload.message ?? payload.text ?? '').toString();
    const teamId = (payload.teamId ?? payload.team_id ?? '').toString();
    const context = ((payload.context ?? 'private') as 'public' | 'private');
    const folderId = payload.folderId ?? payload.folder_id ?? null;
    const limit = Number(payload.limit ?? 5);

    if (!query || !teamId) {
      return NextResponse.json({ error: "query and teamId are required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Prefer storage-aware RPC if present, fallback to generic search_documents
    let data: any = null;
    let error: any = null;
    try {
      const res1 = await supabase.rpc('search_storage_documents', {
        query_text: query,
        team_uuid: teamId,
        ctx: context,
        bucket: null,
        folder: folderId,
        limit_count: isNaN(limit) ? 5 : limit,
      });
      data = res1.data; error = res1.error;
    } catch (_) {}

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      const res2 = await supabase.rpc('search_documents', {
        query_text: query,
        team_uuid: teamId,
        ctx: context,
        folder: folderId,
        limit_count: isNaN(limit) ? 5 : limit,
      });
      data = res2.data; error = res2.error;
    }

    // Fallback: query Supabase Storage directly when no indexed docs found
    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ results: data });
    }

    // Try storage list-based retrieval
    const bucketId = 'team-files';
    const basePath = `teams/${teamId}/${context}`;
    const listRes = await supabase.storage.from(bucketId).list(basePath, {
      limit: 10,
      search: undefined,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (listRes.error) {
      console.error('storage list error:', listRes.error);
    }

    const entries = listRes.data || [];
    const textExt = new Set(['txt', 'md', 'json', 'csv', 'log']);
    const results: Array<{ file_name: string; content_snippet: string; bucket_id: string; object_path: string; score: number }> = [];

    for (const obj of entries) {
      const name = obj.name || '';
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const objectPath = `${basePath}/${name}`;
      let snippet = '';
      if (textExt.has(ext)) {
        const dl = await supabase.storage.from(bucketId).download(objectPath);
        if (!dl.error && dl.data) {
          try {
            const text = await dl.data.text();
            // basic query filter
            if (!query || text.toLowerCase().includes(query.toLowerCase())) {
              snippet = text.substring(0, 1200);
            }
          } catch (e) {
            // ignore decoding errors
          }
        }
      }
      // If snippet still empty, include filename-only result when it loosely matches query
      if (!snippet) {
        const matchName = !query || name.toLowerCase().includes(query.toLowerCase());
        if (!matchName) continue;
        snippet = `File ${name} (non-text preview).`;
      }
      results.push({ file_name: name, content_snippet: snippet, bucket_id: bucketId, object_path: objectPath, score: 0 });
      if (results.length >= (isNaN(limit) ? 5 : limit)) break;
    }

    if (results.length > 0) {
      return NextResponse.json({ results });
    }

    if (error) {
      console.error('search_documents error:', error);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data ?? [] });
  } catch (err) {
    console.error('RAG search error:', err);
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const teamId = searchParams.get('teamId');
    const context = (searchParams.get('context') || 'private') as 'public' | 'private';
    const folderId = searchParams.get('folderId');
    const limit = Number(searchParams.get('limit') || '5');

    if (!query || !teamId) {
      return NextResponse.json({ error: "query and teamId are required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .rpc('search_documents', {
        query_text: query,
        team_uuid: teamId,
        ctx: context,
        folder: folderId,
        limit_count: isNaN(limit) ? 5 : limit,
      });

    if (error) {
      console.error('search_documents error (GET):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data ?? [] });
  } catch (err) {
    console.error('RAG search GET error:', err);
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}


