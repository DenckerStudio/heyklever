import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * POST /api/train-ai/generate-guidelines
 * Calls n8n workflow to generate brand/style guidelines with AI.
 * Body: { hint?: string } (optional context, e.g. guideline name or description)
 * Returns: { guidelines: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;
    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    let body: { hint?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is ok
    }

    const webhookUrl = process.env.N8N_TRAIN_AI_GENERATE_GUIDELINES_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Generate guidelines workflow is not configured" },
        { status: 503 }
      );
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        userId: user.id,
        hint: body.hint ?? "",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("n8n generate-guidelines error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to generate guidelines" },
        { status: 502 }
      );
    }

    const data = await res.json();
    // n8n may return array or object
    const raw = Array.isArray(data) ? data[0] : data;
    const guidelines =
      raw?.json?.guidelines ??
      raw?.guidelines ??
      raw?.body?.guidelines ??
      (typeof raw?.body === "string" ? raw.body : "");

    return NextResponse.json({ guidelines: String(guidelines || "") });
  } catch (error) {
    console.error("Generate guidelines error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
