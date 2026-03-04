import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { teamId, provider } = body as { teamId: string; provider: 'google_drive' | 'onedrive' | 'microsoft' };
        if (!teamId || !provider) return NextResponse.json({ error: 'Missing teamId/provider' }, { status: 400 });

        // Ensure caller is a team admin
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

        let providersToDelete = [provider];
        if (provider === 'onedrive' || provider === 'microsoft') {
            providersToDelete = ['onedrive', 'microsoft'];
        }

        const { error: delErr } = await supabase
            .from('integration_accounts')
            .delete()
            .eq('team_id', teamId)
            .in('provider', providersToDelete);
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}


