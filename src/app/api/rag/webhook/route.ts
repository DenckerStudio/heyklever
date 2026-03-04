import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Patterns for irrelevant/nonsense queries
const IRRELEVANT_PATTERNS = [
  // Date/time questions
  /^hva er (datoen|klokken|tiden)/i,
  /^what('s| is) (the )?(date|time)/i,
  /^når er det/i,
  
  // Personal info questions
  /^hva heter (jeg|du)/i,
  /^hvem er (jeg|du)/i,
  /^what('s| is) my name/i,
  /^who am i/i,
  /^what('s| is) your name/i,
  
  // Greetings and small talk
  /^(hei|hello|hi|hey|hallo|morn|god (morgen|dag|kveld))$/i,
  /^(takk|thanks|thank you|tusen takk)$/i,
  /^(ha det|bye|goodbye|farvel)$/i,
  /^hvordan (har du det|går det)/i,
  /^how are you/i,
  
  // Test queries
  /^(test|testing|123|asdf|qwerty|abc)$/i,
  /^[0-9]+$/,
  
  // Meta questions about the bot
  /^hva kan du/i,
  /^what can you do/i,
  /^hvem laget deg/i,
  /^who (made|created) you/i,
  
  // Random/nonsense
  /^[a-z]{1,3}$/i,
  /^\?+$/,
  /^[\s\W]+$/,
  
  // Weather
  /^(hva er været|how('s| is) the weather)/i,
  
  // Calculator
  /^(regn ut|calculate|hva er \d+[\+\-\*\/])/i
];

function isNonsenseQuery(queryText: string): boolean {
  const q = (queryText || '').trim();
  if (q.length < 3) return true;
  return IRRELEVANT_PATTERNS.some(pattern => pattern.test(q));
}

export async function POST(req: NextRequest) {
  try {
    const { message, teamId, context = 'public', sessionId, language, fileContext } = await req.json();

    if (!message || !teamId) {
      return NextResponse.json({ 
        error: "Message and team ID required" 
      }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Get team info and namespace
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, team_code")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Generate namespace based on context
    const teamCode = team.team_code || team.id.substring(0, 8).toUpperCase();
    const namespace = context === 'private' 
      ? `team_${teamCode}_private`
      : `team_${teamCode}_public`;

    // Get team's folder info for additional context
    const { data: teamFolder } = await supabase
      .from("team_folders")
      .select("folder_id, provider, public_namespace, private_namespace")
      .eq("team_id", teamId)
      .eq("provider", "google_drive")
      .single();

    // Prepare webhook payload for n8n
    const webhookPayload = {
      message,
      teamId,
      teamName: team.name,
      teamCode,
      namespace,
      context,
      folderId: teamFolder?.folder_id,
      provider: teamFolder?.provider,
      timestamp: new Date().toISOString(),
      sessionId,
      language,
      fileContext
    };

    // Call n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ 
        error: "N8N webhook URL not configured" 
      }, { status: 500 });
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    let ragResponse = { response: "", message: "", confidence: "", sources: [] };
    let wasSuccessful = false;

    if (!n8nResponse.ok) {
      console.error('N8N webhook failed:', await n8nResponse.text());
      // We'll still log the attempt as failed
      wasSuccessful = false;
    } else {
      ragResponse = await n8nResponse.json();
      wasSuccessful = true;
    }

    // Insert into search_analytics
    if (sessionId) {
        const isNonsense = isNonsenseQuery(message);
        await supabase.from('search_analytics').insert({
            team_id: teamId,
            context: context,
            session_id: sessionId,
            query_text: message,
            was_successful: wasSuccessful,
            language: language || 'en',
            confidence: ragResponse.confidence || 'medium',
            is_nonsense: isNonsense,
        }).select();
    }

    if (!wasSuccessful) {
        return NextResponse.json({ 
            error: "Failed to process request with RAG system" 
        }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      response: ragResponse.response || ragResponse.message || "I'm processing your request...",
      namespace,
      context,
      teamName: team.name
    });

  } catch (error) {
    console.error("Error processing RAG request:", error);
    return NextResponse.json({ 
      error: "Failed to process request" 
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "healthy",
    service: "RAG Webhook",
    timestamp: new Date().toISOString()
  });
}
