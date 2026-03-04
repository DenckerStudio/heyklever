import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// API endpoint for n8n to look up team by storage path
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get('path') || searchParams.get('folderId'); // Support both for backward compatibility
    
    if (!storagePath) {
      return NextResponse.json({ 
        error: 'path parameter is required' 
      }, { status: 400 });
    }

    // Use service role client to bypass RLS (endpoint is called by n8n without auth)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up by storage path (folder_id, public_folder_id, or private_folder_id)
    const { data: teamFolder, error: folderError } = await supabase
      .from('team_folders')
      .select(`
        *,
        teams (
          id,
          name,
          team_code,
          plan
        )
      `)
      .eq('provider', 'supabase_storage')
      .or(`folder_id.eq.${storagePath},public_folder_id.eq.${storagePath},private_folder_id.eq.${storagePath}`)
      .maybeSingle();

    if (folderError || !teamFolder) {
      return NextResponse.json({ 
        error: 'Team folder not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      teamId: teamFolder.team_id,
      teamName: teamFolder.teams?.name,
      teamCode: teamFolder.teams?.team_code,
      folderId: teamFolder.folder_id,
      folderName: teamFolder.folder_name,
      provider: teamFolder.provider,
      publicNamespace: teamFolder.public_namespace,
      privateNamespace: teamFolder.private_namespace,
      publicFolderId: teamFolder.public_folder_id,
      privateFolderId: teamFolder.private_folder_id,
      storageBucket: teamFolder.storage_bucket
    });

  } catch (error) {
    console.error('Team lookup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
