import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { provisionVPS } from '@/lib/services/provisioning';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { teamId, planId, location, addons } = body;

    if (!teamId || !planId || !location) {
      return NextResponse.json({ error: 'Missing teamId, planId, or location' }, { status: 400 });
    }

    // Verify user is team owner
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch team slug for hostname generation
    const { data: team } = await supabase
      .from('teams')
      .select('slug')
      .eq('id', teamId)
      .single();
    
    if (!team?.slug) {
        return NextResponse.json({ error: 'Team slug not found' }, { status: 404 });
    }

    // Trigger Provisioning
    const result = await provisionVPS(teamId, planId, team.slug, location, addons || []);

    if (!result.success) {
      return NextResponse.json({ error: 'Provisioning failed', details: result.error }, { status: 500 });
    }

    // Mark onboarding as completed
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);

    return NextResponse.json({ success: true, instanceId: result.instanceId });

  } catch (error: any) {
    console.error('Provisioning API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

