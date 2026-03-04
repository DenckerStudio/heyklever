import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team_id from cookie
    const teamId = cookieStore.get('team_id')?.value;
    if (!teamId) {
      return NextResponse.json({ error: 'No team selected' }, { status: 400 });
    }

    // Verify user is member of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'new';

    // Fetch notifications for the team
    const { data: notifications, error } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { team_id, message, type, document_identifier, content, action_url, metadata } = body;

    if (!team_id || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is member of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Create notification
    const { data: notification, error } = await supabase
      .from('app_notifications')
      .insert({
        team_id,
        message,
        type,
        document_identifier: document_identifier || null,
        content: content || null,
        action_url: action_url || null,
        metadata: metadata || null,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Notification creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id, status } = body;

    if (!notification_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the notification to verify team membership
    const { data: notification, error: fetchError } = await supabase
      .from('app_notifications')
      .select('team_id')
      .eq('id', notification_id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Verify user is member of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', notification.team_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Update notification status
    const { data: updatedNotification, error } = await supabase
      .from('app_notifications')
      .update({ status })
      .eq('id', notification_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    return NextResponse.json({ notification: updatedNotification });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
