import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id, action } = body;

    if (!notification_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the notification to verify team membership and get metadata
    const { data: notification, error: fetchError } = await supabase
      .from('app_notifications')
      .select('team_id, metadata, action_url, type')
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

    // Perform specific action logic based on notification type/metadata
    // For now, we'll just handle generic webhooks if action_url is present
    
    if (notification.action_url) {
        try {
            const response = await fetch(notification.action_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notification_id,
                    action,
                    user_id: user.id,
                    metadata: notification.metadata
                })
            });
            
            if (!response.ok) {
                console.error('External action handler failed');
                // We might want to return an error, or just continue to mark as read/processed
            }
        } catch (webhookError) {
             console.error('Webhook error:', webhookError);
        }
    }

    // Update notification status to 'read' or 'archived' after action
    // If the action was 'reject', maybe we want to mark it as archived immediately?
    const newStatus = action === 'reject' ? 'archived' : 'read';

    const { error: updateError } = await supabase
      .from('app_notifications')
      .update({ status: newStatus })
      .eq('id', notification_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update notification status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

