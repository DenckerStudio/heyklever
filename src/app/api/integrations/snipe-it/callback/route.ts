import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/integrations/snipe-it/callback
 * Webhook for n8n (or other) to send back company_id after registering a team in Snipe-IT.
 * Body: { team_id: string, company_id: number }
 * Header: X-Webhook-Secret (optional) - if SNIPE_IT_REGISTER_CALLBACK_SECRET is set, must match.
 */
export async function POST(req: NextRequest) {
	const secret = process.env.SNIPE_IT_REGISTER_CALLBACK_SECRET;
	if (secret) {
		const headerSecret = req.headers.get('X-Webhook-Secret') ?? req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
		if (headerSecret !== secret) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	let body: { team_id?: string; company_id?: number };
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { team_id: teamId, company_id: companyId } = body;
	if (!teamId || typeof companyId !== 'number') {
		return NextResponse.json({ error: 'team_id and company_id required' }, { status: 400 });
	}

	const admin = createSupabaseAdminClient();

	const { data: row } = await admin
		.from('team_settings')
		.select('settings')
		.eq('team_id', teamId)
		.maybeSingle();

	const current = (row?.settings as Record<string, unknown>) ?? {};
	const snipe = (current.snipe_it as Record<string, unknown>) ?? {};
	const updated = {
		...current,
		snipe_it: { ...snipe, company_id: companyId },
	};

	const { error } = await admin
		.from('team_settings')
		.upsert(
			{ team_id: teamId, settings: updated, updated_at: new Date().toISOString() },
			{ onConflict: 'team_id' }
		);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ ok: true, company_id: companyId });
}
