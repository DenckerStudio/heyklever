import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { waitForN8n, createN8nOwnerUser, getN8nBaseUrl, deployN8nViaDocker } from '@/lib/services/provisioning';

/**
 * POST /api/provision/retry-n8n-setup
 * Retries n8n setup for a VPS that is running but n8n is not configured
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { teamId } = body;

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

    // Get VPS instance
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('vps_instances')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'VPS instance not found' }, { status: 404 });
    }

    // Check if VPS is running
    if (instance.status !== 'running') {
      return NextResponse.json(
        { error: 'VPS must be running to retry n8n setup', status: instance.status },
        { status: 400 }
      );
    }

    // Check if n8n is already configured
    if (instance.n8n_base_url && instance.n8n_api_user && instance.n8n_api_password) {
      return NextResponse.json(
        { error: 'n8n is already configured', message: 'No retry needed' },
        { status: 400 }
      );
    }

    // Get team info
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('slug, name')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Try to get VM ID from provider_id
    let vmId: number | null = null;
    
    if (instance.provider_id && instance.provider_id.trim() !== '') {
      vmId = Number(instance.provider_id);
      if (isNaN(vmId) || vmId === 0) {
        vmId = null;
      }
    }
    
    // If provider_id is missing, try to extract from n8n_url server ID first
    if (!vmId && instance.n8n_url) {
      const serverIdMatch = instance.n8n_url.match(/srv(\d+)/);
      if (serverIdMatch) {
        const serverId = serverIdMatch[1];
        // Try using the server ID as VM ID (often they match)
        const potentialVmId = Number(serverId);
        if (!isNaN(potentialVmId) && potentialVmId > 0) {
          // Verify this VM ID exists and matches our IP
          try {
            const { getHostingerClients } = await import('@/lib/services/provisioning');
            const { vpsApi } = getHostingerClients();
            const response = await vpsApi.getVirtualMachineDetailsV1(potentialVmId);
            const vmInfo = (response.data as any).data;
            
            if (vmInfo && (vmInfo.ip_address === instance.ip_address || vmInfo.ip === instance.ip_address)) {
              vmId = potentialVmId;
              console.log(`Found VM ID ${vmId} from n8n URL server ID ${serverId}`);
              
              // Update provider_id in database
              await supabaseAdmin
                .from('vps_instances')
                .update({ provider_id: String(vmId) })
                .eq('id', instance.id);
            }
          } catch (error: any) {
            console.warn('Failed to verify VM ID from server ID:', error.message);
          }
        }
      }
    }
    
    // If still missing, try to find VM by IP address via Hostinger API
    if (!vmId && instance.ip_address) {
      try {
        const { getHostingerClients } = await import('@/lib/services/provisioning');
        const { vpsApi } = getHostingerClients();
        
        // Try to get VM details by querying with IP - we'll need to list VMs
        // Note: Hostinger API might not have a direct "list all" endpoint
        // For now, if we have the server ID from n8n_url, we already tried that above
        // If that failed, we might need to try a different approach
        console.log('Attempting to find VM by IP address...');
      } catch (error: any) {
        console.warn('Failed to find VM by IP address:', error.message);
      }
    }
    
    // Check if n8n is already deployed (we have n8n_url)
    if (!instance.n8n_url) {
      return NextResponse.json(
        { 
          error: 'n8n URL not found',
          details: 'Cannot configure n8n: n8n URL is missing. The VPS may not have n8n installed yet.',
        },
        { status: 400 }
      );
    }

    // n8n is already installed via OS template, we just need to configure the owner account
    const baseUrl = instance.n8n_url.replace(/\/$/, ''); // Remove trailing slash
    
    // Update status to installing_n8n
    await supabaseAdmin
      .from('vps_instances')
      .update({ status: 'installing_n8n', updated_at: new Date().toISOString() })
      .eq('id', instance.id);

    try {
      // Wait for n8n to be ready
      console.log(`Waiting for n8n to be ready at ${baseUrl}...`);
      await waitForN8n(baseUrl);

      // Generate password for owner account and Basic Auth
      const { generatePassword } = await import('@/lib/services/provisioning');
      const password = generatePassword();
      console.log('Generated password for n8n owner account');

      // Create owner user
      const adminEmail = process.env.N8N_ADMIN_EMAIL;
      if (!adminEmail) {
        throw new Error('N8N_ADMIN_EMAIL environment variable is not set');
      }

      // Create owner user - use the createN8nOwnerUser function which tries /rest/users first
      let ownerCreated = false;
      try {
        await createN8nOwnerUser({
          baseUrl: baseUrl,
          email: adminEmail,
          password,
          firstName: team.name || 'Team',
          lastName: team.slug || instance.team_id.slice(0, 8),
          // Basic Auth is optional - function will try without it first
          basicAuthUser: 'admin',
          basicAuthPassword: password,
        });
        ownerCreated = true;
        console.log('✓ n8n owner user created successfully');
      } catch (ownerError: any) {
        // Check if it's already initialized (user might exist)
        if (ownerError.message?.includes('already initialized') || ownerError.message?.includes('409')) {
          ownerCreated = true;
          console.log('✓ n8n owner user already exists or n8n is already initialized');
        } else {
          console.warn('Owner user creation failed:', ownerError.message);
          // Continue anyway - credentials are stored, user can complete setup manually
        }
      }

      // Update database with n8n credentials
      await supabaseAdmin
        .from('vps_instances')
        .update({
          status: 'running',
          n8n_base_url: `${baseUrl}/rest`,
          n8n_api_user: 'admin',
          n8n_api_password: password,
          n8n_url: baseUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id);

      return NextResponse.json({
        success: true,
        message: ownerCreated 
          ? 'n8n owner account created successfully' 
          : 'n8n credentials stored (owner account may need manual setup)',
        n8n_url: baseUrl,
      });

    } catch (error: any) {
      console.error('n8n setup retry failed:', error);
      
      // Update status back to running (but without n8n config)
      await supabaseAdmin
        .from('vps_instances')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', instance.id);

      return NextResponse.json(
        {
          error: 'Failed to setup n8n',
          details: error.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Retry n8n setup API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

