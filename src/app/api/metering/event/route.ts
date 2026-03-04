import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/metering/event
 * Ingests usage events from n8n or app (screens, storage_gb, assets_count, ai_credits, etc.).
 * Auth: either Authorization: Bearer <METERING_WEBHOOK_SECRET> (n8n) or session (app).
 * Body: { team_id: string, metric_type: string, quantity: number, metadata?: object }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const webhookSecret = process.env.METERING_WEBHOOK_SECRET;
    const isWebhook = webhookSecret && authHeader === `Bearer ${webhookSecret}`;

    if (!isWebhook) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { team_id: teamId, metric_type: metricType, quantity, metadata } = body;

    if (!teamId || !metricType || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: team_id, metric_type, quantity' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ error: 'quantity must be a non-negative number' }, { status: 400 });
    }

    const allowed = [
      'screens', 'storage_gb', 'assets_count', 'ai_credits',
      'tokens', 'rag_input_tokens', 'rag_output_tokens', 'documents', 'chat_messages'
    ];
    if (!allowed.includes(metricType)) {
      return NextResponse.json({ error: `metric_type must be one of: ${allowed.join(', ')}` }, { status: 400 });
    }

    await supabaseAdmin.from('usage_events').insert({
      team_id: teamId,
      metric_type: metricType,
      quantity: qty,
      metadata: metadata ?? {},
    });

    return NextResponse.json({ ok: true, recorded: qty });
  } catch (e) {
    console.error('Metering event error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
