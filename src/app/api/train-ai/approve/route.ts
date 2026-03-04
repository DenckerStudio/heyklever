import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

interface SourceContent {
  type: "url" | "file" | "audio";
  name: string;
}

// Extract topics from content
function extractTopicsFromContent(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'as', 'if', 'when', 'where', 'how', 'what',
    'which', 'who', 'whom', 'why', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'new',
  ]);
  
  for (const word of words) {
    if (word.length < 4 || /^\d+$/.test(word) || stopWords.has(word)) continue;
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length < 4) continue;
    wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
  }
  
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sortedWords;
}

// Extract title from markdown content
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Fallback: use first line or first 50 chars
  const firstLine = content.split('\n')[0]?.replace(/^#+\s*/, '').trim();
  return firstLine?.substring(0, 50) || 'Untitled Document';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId: bodyTeamId, document, sourceContent, outputType } = body as {
      teamId?: string;
      document: string;
      sourceContent?: SourceContent[];
      outputType?: string;
    };

    // Validate required fields
    if (!document || typeof document !== 'string' || document.trim().length === 0) {
      return NextResponse.json({ error: "Document content is required" }, { status: 400 });
    }

    // Get team ID from cookie or body
    const cookieStore = await cookies();
    const teamId = bodyTeamId || cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract metadata from document
    const title = extractTitle(document);
    const topics = extractTopicsFromContent(document);
    const sources = sourceContent?.map(s => s.name) || [];

    // Prepare document data for RAG ingestion
    // documents table uses content + metadata (team_id, file_name etc. live in metadata for RAG filtering)
    const fileName = `${title} (AI Generated)`;
    const documentData = {
      content: document,
      metadata: {
        team_id: teamId,
        file_name: fileName,
        source: 'ai-generated',
        output_type: outputType || 'documentation',
        generated_by: user.id,
        generated_at: new Date().toISOString(),
        source_files: sources,
        topics,
        entities: [],
        context: 'private',
        ingested_at: new Date().toISOString(),
      },
    };

    // Insert into documents table
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to insert document:', error);
      return NextResponse.json(
        { error: "Failed to save document to knowledge base", details: error.message },
        { status: 500 }
      );
    }

    // Also save to generated_outputs for history tracking
    const now = new Date().toISOString();
    const { error: historyError } = await supabase
      .from('generated_outputs')
      .insert({
        team_id: teamId,
        title,
        output_type: outputType || 'documentation',
        content: document,
        status: 'approved',
        approved_at: now,
        approved_by: user.id,
        document_id: data.id,
        ingested_at: now,
        metadata: {
          source_files: sources,
          topics,
        },
        created_by: user.id,
      });

    if (historyError) {
      console.error('Failed to save to history:', historyError);
      // Don't fail the request, document is already saved
    }

    // Optionally trigger n8n enrichment webhook for RAG indexing
    const webhookUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            documentId: data.id,
            fileName: documentData.metadata.file_name,
            content: document,
            source: 'ai-generated',
            outputType,
          }),
        });
      } catch (e) {
        console.error('Failed to trigger enrichment webhook:', e);
        // Don't fail the request if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      documentId: data.id,
      title: fileName,
      message: "Document approved and added to AI knowledge base",
    });

  } catch (error) {
    console.error("Train AI Approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
