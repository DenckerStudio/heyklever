import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Storage webhook receiver
// Configure: Storage -> bucket (team-files) -> Webhooks -> POST to /api/storage/webhook

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const type = payload?.type || payload?.eventType || '';
    const record = payload?.record || payload?.data || {};
    const bucketId = record?.bucket_id || record?.bucket || 'team-files';
    const objectPath = record?.name || record?.path || '';
    let ownerId = record?.owner_id || record?.owner || null;

    if (!objectPath) {
      return NextResponse.json({ error: 'Missing object path' }, { status: 400 });
    }

    // Only handle create/updated events
    if (!/create|update|OBJECT_CREATED|OBJECT_FINALIZE/i.test(type)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const admin = createClient(supabaseUrl, serviceKey);

    // Parse Path for Context & Metadata
    // Personal: teams/{teamId}/members/{userId}/AI-Docs/...
    // Team:     teams/{teamId}/(Public|Private)/AI-Docs/...
    
    const parts = objectPath.split('/');
    const teamsIdx = parts.indexOf('teams');
    let inferredTeamId = payload?.teamId || payload?.context?.teamId || null;
    let isPersonal = false;

    if (teamsIdx >= 0 && parts.length > teamsIdx + 1) {
      if (!inferredTeamId) {
      inferredTeamId = parts[teamsIdx + 1];
    }

      // Check for members (Personal)
      if (parts[teamsIdx + 2] === 'members' && parts.length > teamsIdx + 3) {
         // Path: teams/{teamId}/members/{userId}/...
         const pathUserId = parts[teamsIdx + 3];
         // Only treat as personal if it's in AI-Docs or explicitly structured so
         if (parts[teamsIdx + 4] === 'AI-Docs') {
             isPersonal = true;
             if (!ownerId) ownerId = pathUserId;
         }
      } 
    }

    // Download file content
    const { data: fileData, error: downloadError } = await admin.storage.from(bucketId).download(objectPath);
    if (downloadError) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json({ error: 'Failed to download object' }, { status: 500 });
    }

    // Naive content extraction
    const fileName = parts[parts.length - 1] || 'file';
    const lower = fileName.toLowerCase();
    let content = '';
    if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || lower.endsWith('.json')) {
      content = await fileData.text();
    }

    // Upsert into ai_documents
    const metadata = {
      ...(ownerId ? { user_id: ownerId } : {}),
      ...(isPersonal ? { is_personal: true } : {})
    };

    // We search for existing doc by team_id + object_path to update, or insert new.
    // Since 'id' is PK, we need to match on unique constraints or do a select first if we don't have a unique constraint on object_path.
    // Let's check if we have a unique constraint. Migration 0046 doesn't add one on object_path, so upsert on object_path won't work directly without conflict target.
    // We'll select first.

    const { data: existingDocs } = await admin
      .from('ai_documents')
      .select('id')
      .eq('team_id', inferredTeamId)
      .eq('object_path', objectPath)
      .single();

    let result;
    if (existingDocs?.id) {
       result = await admin
         .from('ai_documents')
         .update({
           file_name: fileName,
           content: content || null,
           metadata,
           updated_at: new Date().toISOString()
         })
         .eq('id', existingDocs.id)
         .select()
         .single();
    } else {
       result = await admin
         .from('ai_documents')
         .insert({
           team_id: inferredTeamId,
           file_name: fileName,
           content: content || null,
           bucket_id: bucketId,
           object_path: objectPath,
           metadata
         })
         .select()
         .single();
    }

    if (result.error) {
      console.error('ai_documents upsert error:', result.error);
      return NextResponse.json({ error: 'Failed to upsert document', details: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: result.data?.id, delegated: false });
  } catch (e) {
    console.error('Storage webhook error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
