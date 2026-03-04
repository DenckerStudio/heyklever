import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { selectedText, instruction, fullText } = await req.json();

    if (!selectedText || !instruction) {
      return NextResponse.json({ error: "Missing selectedText or instruction" }, { status: 400 });
    }

    // Use specific webhook for modification, fallback to generic chat/webhook if needed
    // The user didn't provide a specific URL for modification, so we'll try to find one or fail gracefully
    // But since "We use n8n as backend", let's assume a new env var or re-use one.
    // For now I'll use N8N_MODIFY_DOC_WEBHOOK_URL and log if missing.
    const webhookUrl = process.env.N8N_MODIFY_DOC_WEBHOOK_URL || process.env.N8N_AI_MODIFY_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("N8N_MODIFY_DOC_WEBHOOK_URL is not set. Returning mock response for testing if no webhook.");
      // For development/testing without the real backend, we could return a mock
      // return NextResponse.json({ 
      //   modifiedText: `[AI Modified]: ${selectedText}\n\n(Instruction: ${instruction})` 
      // });
      return NextResponse.json({ error: "Configuration error: N8N_MODIFY_DOC_WEBHOOK_URL is missing" }, { status: 500 });
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedText,
        instruction,
        fullText, // context
        action: "modify_text"
      }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: "AI service error", details: errorText }, { status: res.status });
    }

    const data = await res.json();
    // Expecting { modifiedText: string } from n8n
    return NextResponse.json(data);

  } catch (error) {
    console.error("Modify API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

