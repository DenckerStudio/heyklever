import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { teamId, action = 'sync' } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Get team info
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, team_code")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get team folder info
    const { data: teamFolder, error: folderError } = await supabase
      .from("team_folders")
      .select("*")
      .eq("team_id", teamId)
      .eq("provider", "google_drive")
      .single();

    if (folderError || !teamFolder) {
      return NextResponse.json({ error: "Team folder not found" }, { status: 404 });
    }

    // Generate team code if not exists
    const teamCode = team.team_code || team.id.substring(0, 8).toUpperCase();

    // Prepare sync payload for n8n
    const syncPayload = {
      action,
      teamId,
      teamName: team.name,
      teamCode,
      folderId: teamFolder.folder_id,
      provider: teamFolder.provider,
      namespaces: {
        main: teamFolder.pinecone_namespace,
        public: teamFolder.public_namespace,
        private: teamFolder.private_namespace
      },
      timestamp: new Date().toISOString()
    };

    // Call n8n webhook for sync
    const n8nWebhookUrl = process.env.N8N_SYNC_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ 
        error: "N8N sync webhook URL not configured" 
      }, { status: 500 });
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncPayload),
    });

    if (!n8nResponse.ok) {
      console.error('N8N sync webhook failed:', await n8nResponse.text());
      return NextResponse.json({ 
        error: "Failed to trigger sync with AI system" 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Sync triggered successfully",
      teamName: team.name,
      folderName: teamFolder.folder_name
    });

  } catch (error) {
    console.error("Error triggering sync:", error);
    return NextResponse.json({ 
      error: "Failed to trigger sync" 
    }, { status: 500 });
  }
}
