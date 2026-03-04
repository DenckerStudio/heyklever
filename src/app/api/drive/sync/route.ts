import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Manual sync endpoint for n8n to trigger folder re-indexing
export async function POST(request: NextRequest) {
  try {
    const { teamId, path, action } = await request.json();
    
    if (!path || !action) {
      return NextResponse.json({ 
        error: 'Missing required parameters: path, action' 
      }, { status: 400 });
    }

    // Use service role client to bypass RLS (n8n calls without auth)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get team folder information by storage path
    const { data: teamFolder, error: folderError } = await supabase
      .from('team_folders')
      .select('*')
      .eq('provider', 'supabase_storage')
      .or(`folder_id.eq.${path},public_folder_id.eq.${path},private_folder_id.eq.${path}`)
      .maybeSingle();

    if (folderError || !teamFolder) {
      return NextResponse.json({ 
        error: 'Team folder not found' 
      }, { status: 404 });
    }

    // Get team information via service role, prefer found team_id
    const resolvedTeamId = teamId || teamFolder.team_id;
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', resolvedTeamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ 
        error: 'Team not found' 
      }, { status: 404 });
    }

    if (action === 'sync') {
      const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || 'team-files';
      
      // Get all files from the team root folder (no longer using Public/Private subfolders)
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket)
        .list(teamFolder.folder_id, { limit: 1000 });

      if (filesError) {
        console.error('Error fetching files:', filesError);
      }

      // Return file information for n8n to process
      return NextResponse.json({
        success: true,
        teamId: resolvedTeamId,
        teamCode: team.team_code,
        path,
        folderName: teamFolder.folder_name,
        folderId: teamFolder.folder_id,
        storageBucket: bucket,
        files: files || [],
        syncTimestamp: new Date().toISOString()
      });

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Supported actions: sync' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
