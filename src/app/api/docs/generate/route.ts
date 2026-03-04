import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const actionType = formData.get("actionType") as string; // 'guide', 'docs', 'blog'
    const sourceType = formData.get("sourceType") as string;
    const url = formData.get("url") as string;
    const file = formData.get("file") as File | null;
    const context = formData.get("context") as string; // 'team' or 'personal'
    const visibility = formData.get("visibility") as string; // 'public' or 'private'
    const folderName = formData.get("folderName") as string || "";

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID not found" }, { status: 400 });
    }

    // Construct the Target Path for n8n to save back to
    let targetPathBase = "";
    if (context === "personal") {
        targetPathBase = `teams/${teamId}/members/${user.id}/AI-Docs`;
    } else {
        // Team
        const visibilityFolder = visibility === "public" ? "Public" : "Private";
        targetPathBase = `teams/${teamId}/${visibilityFolder}/AI-Docs`;
    }

    if (folderName) {
        targetPathBase += `/${folderName}`;
    }

    // Prepare payload for n8n
    const n8nFormData = new FormData();
    n8nFormData.append("teamId", teamId);
    n8nFormData.append("userId", user.id);
    n8nFormData.append("actionType", actionType);
    n8nFormData.append("sourceType", sourceType);
    n8nFormData.append("targetPath", targetPathBase);
    n8nFormData.append("context", context);
    n8nFormData.append("visibility", visibility);
    
    if (sourceType === "url") {
        n8nFormData.append("url", url);
    } else if (file) {
        n8nFormData.append("file", file);
    }

    // Webhook URL
    const n8nWebhookUrl = process.env.N8N_GENERATE_DOC_WEBHOOK_URL;
    console.log("Using N8N Webhook URL:", n8nWebhookUrl);
    
    if (!n8nWebhookUrl) {
        return NextResponse.json({ error: "Configuration error: Webhook URL missing" }, { status: 500 });
    }

    // Send to n8n
    try {
        const n8nRes = await fetch(n8nWebhookUrl, {
            method: "POST",
            body: n8nFormData,
        });

        if (!n8nRes.ok) {
            const errorText = await n8nRes.text();
            console.error("n8n error status:", n8nRes.status);
            console.error("n8n error body:", errorText);
            return NextResponse.json({ 
                error: "AI service rejected the request", 
                details: errorText || `Status: ${n8nRes.status}`,
                status: n8nRes.status
            }, { status: n8nRes.status }); // Forward the actual status code (e.g. 404, 500)
        }
        
        return NextResponse.json({ success: true, message: "Generation started" });
    } catch (fetchError) {
        console.error("Fetch error calling n8n:", fetchError);
        return NextResponse.json({ 
            error: "Network error calling AI service", 
            details: (fetchError as Error).message 
        }, { status: 502 });
    }

  } catch (error) {
    console.error("Generate Doc API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
