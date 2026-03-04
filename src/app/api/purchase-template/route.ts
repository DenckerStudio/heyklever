import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeamN8nConfig, getTemplateById, validateWorkflowJSON } from '@/lib/n8nConfig';

/**
 * POST /api/purchase-template
 * Purchases and installs an n8n workflow template on the user's VPS instance
 * 
 * Body: { templateId: string }
 * 
 * Returns: { status: 'installed', workflowId: string, n8nUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get user's team ID from profile or team_members
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_team_id')
      .eq('id', user.id)
      .maybeSingle();

    let teamId = profile?.default_team_id;

    // If no default team, get first team the user is a member of
    if (!teamId) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: 'User is not a member of any team' },
          { status: 400 }
        );
      }

      teamId = membership.team_id;
    }

    // 3. Validate templateId from request body
    const body = await req.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // 4. Check VPS instance status - must be 'running'
    const { data: vpsInstance, error: vpsError } = await supabase
      .from('vps_instances')
      .select('id, status')
      .eq('team_id', teamId)
      .single();

    if (vpsError || !vpsInstance) {
      return NextResponse.json(
        { error: 'VPS instance not found for this team' },
        { status: 404 }
      );
    }

    if (vpsInstance.status !== 'running') {
      return NextResponse.json(
        { 
          error: 'VPS instance is not running',
          status: vpsInstance.status,
          message: 'Template installation is only available when the VPS is running'
        },
        { status: 400 }
      );
    }

    // 5. Fetch team's n8n config
    const n8nConfig = await getTeamN8nConfig(teamId);
    if (!n8nConfig) {
      return NextResponse.json(
        { error: 'Customer n8n instance not configured' },
        { status: 400 }
      );
    }

    // 6. Load template from Supabase
    const template = await getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const { workflow } = template;

    // 7. Validate workflow JSON structure
    if (!validateWorkflowJSON(workflow)) {
      return NextResponse.json(
        { error: 'Template workflow JSON invalid' },
        { status: 500 }
      );
    }

    // 8. Create workflow in n8n for this customer
    // Prepare Basic Auth header
    const credentials = Buffer.from(`${n8nConfig.username}:${n8nConfig.password}`).toString('base64');
    const authHeader = `Basic ${credentials}`;

    // Prepare workflow payload
    const workflowPayload = {
      name: workflow.name ?? template.name,
      active: workflow.active ?? false,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings ?? {},
      tags: [template.id, 'purchased'],
    };

    try {
      const n8nResponse = await fetch(`${n8nConfig.baseUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(workflowPayload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('n8n API error:', n8nResponse.status, errorText);
        return NextResponse.json(
          { 
            error: 'Failed to install template on n8n',
            details: errorText || `n8n API returned status ${n8nResponse.status}`
          },
          { status: 500 }
        );
      }

      const workflowResult = await n8nResponse.json();

      // 9. Return success response
      return NextResponse.json({
        status: 'installed',
        workflowId: workflowResult.id,
        n8nUrl: n8nConfig.baseUrl.replace(/\/rest$/, ''),
      });

    } catch (fetchError: any) {
      console.error('Install template error:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to install template on n8n',
          details: fetchError.message || 'Network error'
        },
        { status: 500 }
      );
    }

  } catch (err: any) {
    console.error('Purchase template error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

