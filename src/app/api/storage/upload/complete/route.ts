import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { objectPath, bucketId, fileName, contentType, scope } = body;

    if (!objectPath || !bucketId || !fileName) {
      return NextResponse.json({ 
        error: "Missing required fields: objectPath, bucketId, fileName" 
      }, { status: 400 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Call the n8n webhook for file ingestion
    const webhookUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL as string;
    
    if (webhookUrl) {
      const webhookBody = {
        objectPath,
        bucketId,
        fileName,
        contentType: contentType || 'application/octet-stream',
        context: scope || 'private',
        teamId,
      };

      // Fire and forget - don't wait for response
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody),
      }).catch(err => {
        console.error("Background webhook call failed:", err);
      });

      console.log('Webhook triggered for file:', fileName);
    } else {
      console.warn('N8N_STORAGE_INGEST_WEBHOOK_URL not configured');
    }

    return NextResponse.json({ 
      ok: true,
      message: 'Upload completed and webhook triggered'
    });

  } catch (error) {
    console.error('Upload complete API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

