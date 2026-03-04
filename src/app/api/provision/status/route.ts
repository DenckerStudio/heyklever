import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkProvisionStatus } from '@/lib/services/provisioning';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    }

    // Verify user is team member
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check provisioning status
    const result = await checkProvisionStatus(teamId);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Status check API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

