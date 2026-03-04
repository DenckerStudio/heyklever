import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callMicrosoftGraph } from "@/lib/integrations/microsoft";
import { sendContentToStorageIngestWebhook } from "@/lib/n8n";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = req.cookies;
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team selected" }, { status: 400 });
    }

    // Verify admin/member? Syncing files usually requires at least member access.
    // If we write to "Imports", members are fine.
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items to sync" }, { status: 400 });
    }

    const results = [];

    // Get team folder info to find bucket (usually 'team-files')
    // We can query team_folders or just default to 'team-files' and check integration config
    // For now assume 'team-files' which is standard.
    const bucketId = process.env.SUPABASE_STORAGE_BUCKET || 'team-files';

    for (const item of items) {
      try {
        if (item.folder) {
           // Skip folders for now, or implement recursion
           results.push({ id: item.id, status: "skipped", reason: "is folder" });
           continue;
        }

        // 1. Download from Microsoft Graph
        // /drives/{driveId}/items/{itemId}/content
        const driveId = item.parentReference?.driveId || item.driveId;
        if (!driveId) {
            results.push({ id: item.id, status: "error", message: "Missing driveId" });
            continue;
        }
        
        // We use callMicrosoftGraph but we need the raw response stream (blob/buffer)
        // callMicrosoftGraph returns JSON. We need a custom call or modify helper.
        // Let's implement fetch manually here using the token helper.
        
        // Import getMicrosoftAccessToken from lib (needs to be exported)
        const { getMicrosoftAccessToken } = await import("@/lib/integrations/microsoft");
        const token = await getMicrosoftAccessToken(supabase, teamId);
        
        if (!token) {
            throw new Error("Failed to get access token");
        }

        const downloadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${item.id}/content`;
        const res = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Download failed: ${res.statusText}`);
        }

        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        
        // 2. Upload to Supabase Storage
        const filePath = `teams/${teamId}/Imports/Microsoft/${item.name}`;
        
        const { error: uploadError } = await supabase.storage
            .from(bucketId)
            .upload(filePath, buffer, {
                contentType: res.headers.get("content-type") || "application/octet-stream",
                upsert: true
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // 3. Trigger n8n ingestion
        // The helper sendContentToStorageIngestWebhook takes payload.
        // Based on analysis, it should send objectPath.
        // But the types in lib/n8n.ts enforce 'content' string.
        // I might need to update lib/n8n.ts or just cast it if the webhook handles it.
        // The webhook expects JSON body with objectPath.
        
        // Update lib/n8n.ts or call fetch directly.
        // Let's call fetch directly to be safe and flexible.
        const n8nUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL || process.env.N8N_INGEST_WEBHOOK_URL;
        if (n8nUrl) {
             await fetch(n8nUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bucketId,
                    objectPath: filePath,
                    fileName: item.name,
                    teamId,
                    context: "private", // Default to private import
                    visibilityScope: "internal",
                    source: "microsoft"
                })
             });
        }

        results.push({ id: item.id, status: "success", path: filePath });

      } catch (e) {
        console.error("Sync error for item", item.name, e);
        results.push({ id: item.id, status: "error", message: (e as Error).message });
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
