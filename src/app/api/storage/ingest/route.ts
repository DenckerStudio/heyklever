import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";

/**
 * Storage Ingest API
 *
 * This endpoint is called AFTER a file has been uploaded to storage (or Nextcloud).
 * It triggers the n8n webhook to process/index the file.
 *
 * Expected body (Supabase storage):
 * - objectPath: Full storage path (e.g., "teams/{teamId}/folder/file.pdf")
 * - bucketId: Storage bucket name
 * - fileName: Original file name
 * - content: Optional text content (for text-based files)
 * - visibilityScope: 'internal' | 'public' | 'restricted' (default: 'internal')
 * - allowedClientCodes: Array of clientCodes that have access (only for 'restricted' scope)
 *
 * Expected body (Nextcloud):
 * - source: 'nextcloud'
 * - nextcloudFilePath: Path of file in Nextcloud (e.g. "Acme/Docs/file.pdf")
 * - fileName: Original file name
 * - teamId: Team id (required when source is nextcloud, e.g. when called from server)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const cookieStore = await cookies();
    const teamIdFromCookie = cookieStore.get('team_id')?.value;
    const teamId = body.teamId ?? teamIdFromCookie;

    if (!teamId) {
      return NextResponse.json({ error: 'No team context found' }, { status: 401 });
    }

    const {
      source,
      objectPath,
      nextcloudFilePath,
      bucketId,
      fileName,
      content,
      visibilityScope = 'internal',
      allowedClientCodes = [],
    } = body;

    const isNextcloud = source === 'nextcloud';

    if (isNextcloud && (!nextcloudFilePath || !fileName)) {
      return NextResponse.json(
        { error: 'nextcloudFilePath and fileName required when source is nextcloud' },
        { status: 400 }
      );
    }

    if (!isNextcloud && !objectPath) {
      return NextResponse.json({ error: 'objectPath (or nextcloudFilePath) required' }, { status: 400 });
    }

    const fileId = isNextcloud ? nextcloudFilePath : objectPath;

    console.log('Ingest API - triggering n8n webhook:', {
      source: isNextcloud ? 'nextcloud' : 'storage',
      fileName,
      visibilityScope: isNextcloud ? undefined : visibilityScope,
      teamId,
      fileId,
    });

    const webhookUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL || process.env.N8N_INGEST_WEBHOOK_URL;

    if (webhookUrl) {
      const n8nPayload = isNextcloud
        ? {
            source: 'nextcloud',
            nextcloudFilePath,
            fileName,
            teamId,
            fileId: nextcloudFilePath,
            timestamp: new Date().toISOString(),
          }
        : {
            fileName,
            objectPath,
            bucketId: bucketId || 'team-files',
            teamId,
            fileId: objectPath,
            visibilityScope: visibilityScope || 'internal',
            allowedClientCodes: allowedClientCodes || [],
            content: content || '',
            timestamp: new Date().toISOString(),
          };

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      })
        .then((res) => {
          if (!res.ok) console.error('n8n webhook returned error:', res.status);
          else console.log('n8n webhook triggered successfully');
        })
        .catch((err) => console.error('n8n webhook trigger failed:', err));
    } else {
      console.warn('No N8N_STORAGE_INGEST_WEBHOOK_URL configured');
    }

    return NextResponse.json({
      ok: true,
      path: isNextcloud ? nextcloudFilePath : objectPath,
      message: 'Ingest webhook triggered',
    });
  } catch (e) {
    console.error('Ingest API error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
