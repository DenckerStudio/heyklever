import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Provider = 'google_drive' | 'onedrive';
interface OAuthTokens {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    expires_at?: string | number | null;
}
interface IntegrationSetupBody {
    teamId: string;
    provider: Provider;
    tokens?: OAuthTokens;
    config?: {
        client_id?: string;
        client_secret?: string;
        authorization_url?: string;
        access_token_url?: string;
    };
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body: IntegrationSetupBody = await req.json();
        const { teamId, provider, tokens, config } = body;
        if (!teamId || !provider) return NextResponse.json({ error: 'Missing teamId/provider' }, { status: 400 });

        // Ensure caller is a team admin (avoid recursion by checking membership table directly)
        const { data: member, error: memberErr } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 400 });
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Try to resolve provider account identity using tokens (best-effort)
        let providerAccountEmail: string | null = null;
        let providerAccountId: string | null = null;
        let metadata: Record<string, unknown> | null = null;
        try {
            if (provider === 'google_drive' && tokens?.access_token) {
                const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                if (r.ok) {
                    const data = await r.json();
                    providerAccountEmail = data.email ?? null;
                    providerAccountId = data.id ?? null;
                    metadata = { name: data.name, picture: data.picture };
                }
            } else if (provider === 'onedrive' && tokens?.access_token) {
                const r = await fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                if (r.ok) {
                    const data = await r.json();
                    providerAccountEmail = data.mail || data.userPrincipalName || null;
                    providerAccountId = data.id ?? null;
                    metadata = { displayName: data.displayName }; 
                }
            }
        } catch {}

        // Persist/Update integration account tokens and identity
        const upsert = {
            team_id: teamId,
            provider,
            client_id: config?.client_id || null,
            client_secret: config?.client_secret || null,
            authorization_url: config?.authorization_url || null,
            access_token_url: config?.access_token_url || null,
            access_token: tokens?.access_token || null,
            refresh_token: tokens?.refresh_token || null,
            scope: tokens?.scope || null,
            expires_at: tokens?.expires_at ? new Date(tokens.expires_at) : null,
            status: 'connected',
            provider_account_email: providerAccountEmail,
            provider_account_id: providerAccountId,
            metadata,
        } as const;
        const { error: upsertErr } = await supabase.from('integration_accounts').upsert(upsert, { onConflict: 'team_id,provider' });
        if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 });

        // Note: Team folders are now created manually by admins
        // This allows for better control over folder creation and sharing

        // Legacy n8n setup trigger removed as we no longer store credentials in n8n.
        // File ingestion works via standard webhooks using Supabase Storage events or direct API calls.

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


