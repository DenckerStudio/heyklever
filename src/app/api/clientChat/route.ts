import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * Client Chat API Route
 * Used by: animated-ai-chat.tsx (client-facing chat) and GlobalChat component
 * Webhook: KLEVERAI_WEBHOOK_URL (env variable)
 * Context: Dynamic - 'public' or 'private' (passed from client)
 * 
 * Supports both streaming and non-streaming responses.
 * Client chat has access to 'public' and 'restricted' documents (if clientCode matches)
 */
export async function POST(req: NextRequest) {
  try {
    const acceptHeader = req.headers.get("accept") || "";
    const body = await req.json();
    
    const { 
      message, 
      teamId, 
      context, 
      clientCode,
      sessionId: bodySessionId,
      streaming: bodyStreaming,
      // Additional settings
      language,
      fileAccessMode,
      allowedFileIds,
    } = body;

    // Determine if streaming is requested
    let streaming = bodyStreaming === true;
    if (acceptHeader.includes("text/event-stream")) {
      streaming = true;
    }

    if (!message || !teamId) {
      return NextResponse.json({ error: "Message and team ID required" }, { status: 400 });
    }

    // Get team information from Supabase
    const supabase = await createSupabaseServerClient();
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, team_code')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Determine context (public/private) - default to public for client chat
    const contextType = context || 'public';
    
    // Create namespace based on team and context (fallback if team_code is null)
    const resolvedTeamCode = team.team_code || (team.id || '').toString().replace(/-/g, '').substring(0, 8).toUpperCase() || 'unknown';
    const namespace = `team_${resolvedTeamCode}_${contextType}`;

    // Send request to n8n workflow
    const n8nWebhookUrl = process.env.KLEVERAI_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/chat';
    
    try {
      // Prepare headers for n8n request
      const n8nHeaders: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (streaming) {
        n8nHeaders['Accept'] = 'text/event-stream';
      }

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: JSON.stringify({
          message,
          teamId,
          teamName: team.name,
          teamCode: resolvedTeamCode,
          context: contextType,
          namespace,
          sessionId: bodySessionId || req.headers.get('x-session-id') || crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          // Client chat: Retrieve 'public' and 'restricted' (if clientCode matches) documents
          visibilityScope: 'client',
          clientCode: clientCode || null, // Used for filtering restricted documents
          // Additional settings for language and file access
          language: language || 'no', // Default to Norwegian
          fileAccessMode: fileAccessMode || 'all_public',
          allowedFileIds: fileAccessMode === 'selected_files' ? (allowedFileIds || []) : null,
        }),
      });

      if (!n8nResponse.ok) {
        throw new Error(`N8N workflow error: ${n8nResponse.status}`);
      }

      const n8nContentType = n8nResponse.headers.get('content-type') || '';

      // Handle streaming response
      if (streaming && (n8nContentType.includes('text/event-stream') || n8nContentType.includes('text/plain'))) {
        // Pipe the stream directly to the client
        if (!n8nResponse.body) {
          throw new Error('No response body for streaming');
        }

        return new NextResponse(n8nResponse.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'X-Team-Id': teamId,
            'X-Team-Name': encodeURIComponent(team.name),
            'X-Context': contextType,
            'X-Namespace': namespace,
          },
        });
      }

      // Non-streaming: parse JSON response
      const n8nData = await n8nResponse.json();
      
      // Handle different response formats from N8N webhook
      let responseText = "I'm processing your request...";
      
      if (Array.isArray(n8nData) && n8nData.length > 0) {
        // Format: [{ output: "..." }]
        responseText = n8nData[0].output || n8nData[0].answer || n8nData[0].message || responseText;
      } else if (n8nData && typeof n8nData === 'object') {
        // Format: { response: "...", answer: "...", message: "...", or output: "..." }
        responseText = n8nData.output || n8nData.response || n8nData.answer || n8nData.message || responseText;
      }
      
      return NextResponse.json({
        response: {
          answer: responseText,
          sources: n8nData.sources || (Array.isArray(n8nData) ? n8nData[0]?.sources : undefined),
          follow_up_suggestions: n8nData.follow_up_suggestions || (Array.isArray(n8nData) ? n8nData[0]?.follow_up_suggestions : undefined),
        },
        context: contextType,
        namespace,
        teamId,
        teamName: team.name,
      });

    } catch (n8nError) {
      console.error('N8N workflow error:', n8nError);
      
      // Fallback response if n8n is unavailable
      const fallbackResponses = [
        "I'd be happy to help you with that! Let me search through the available information.",
        "That's a great question. Based on the information I have access to, here's what I can tell you...",
        "I can help you with that. Let me look through the relevant documents and provide you with an answer.",
        "Thank you for your question. I'll search through the available resources to give you the best answer possible.",
      ];

      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

      // For streaming requests, return error as SSE
      if (streaming) {
        const errorStream = new ReadableStream({
          start(controller) {
            const errorMessage = `${fallbackResponse} (Note: RAG system is temporarily unavailable)`;
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: errorMessage, error: true })}\n\n`));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new NextResponse(errorStream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      return NextResponse.json({
        response: {
          answer: `${fallbackResponse} (Note: RAG system is temporarily unavailable)`,
          sources: [],
          follow_up_suggestions: [],
        },
        context: contextType,
        namespace,
        teamId,
        teamName: team.name,
        error: "RAG system unavailable",
      });
    }

  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
