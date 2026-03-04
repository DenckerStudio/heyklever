type TeamSetupPayload = {
    teamId: string;
    provider: 'google_drive' | 'onedrive';
    userEmail?: string;
    tokens?: {
        access_token?: string;
        refresh_token?: string;
        scope?: string;
        expires_at?: string | number; // ISO or epoch seconds
    };
};

export async function triggerTeamSetupInN8N(payload: TeamSetupPayload) {
    const webhookUrl = process.env.N8N_TEAM_SETUP_WEBHOOK_URL as string;
    if (!webhookUrl) {
        throw new Error('Missing env N8N_TEAM_SETUP_WEBHOOK_URL');
    }
    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`n8n webhook failed (${res.status}): ${text}`);
    }
    return res.json().catch(() => ({}));
}


type StorageIngestPayload = {
    teamId: string;
    teamName?: string;
    context: 'public' | 'private';
    bucketId: string; // e.g., 'team-files'
    objectPath: string; // e.g., 'teams/<teamId>/<context>/.../file.ext'
    fileName?: string;
    content: string; // extracted text
};

export async function sendContentToStorageIngestWebhook(payload: StorageIngestPayload) {
    const webhookUrl = (process.env.N8N_STORAGE_INGEST_WEBHOOK_URL as string) || (process.env.N8N_INGEST_WEBHOOK_URL as string);
    if (!webhookUrl) {
        throw new Error('Missing env N8N_STORAGE_INGEST_WEBHOOK_URL or N8N_INGEST_WEBHOOK_URL');
    }
    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`n8n storage ingest webhook failed (${res.status}): ${text}`);
    }
    return res.json().catch(() => ({}));
}

