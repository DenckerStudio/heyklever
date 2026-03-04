import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Simple HTML to text converter
function htmlToText(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Extract metadata from HTML
function extractMetadata(html: string, url: string): {
  title: string;
  description: string;
  keywords: string[];
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
  
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  const keywords = keywordsMatch 
    ? keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean)
    : [];
  
  return { title, description, keywords };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, teamId: bodyTeamId } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Get team ID from cookie or body
    const cookieStore = await cookies();
    const teamId = bodyTeamId || cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Fetch the webpage
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KleverAI/1.0; +https://heyklever.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (error) {
      return NextResponse.json({ 
        error: "Failed to fetch URL. Make sure the URL is accessible." 
      }, { status: 400 });
    }

    // Extract content
    const content = htmlToText(html);
    const { title, description, keywords } = extractMetadata(html, url);

    // Limit content size (max 50KB of text)
    const truncatedContent = content.substring(0, 50000);

    // Prepare document for indexing
    const documentData = {
      teamId,
      fileName: title || parsedUrl.hostname,
      content: truncatedContent,
      context: 'private' as const,
      metadata: {
        source: 'website',
        url: url,
        hostname: parsedUrl.hostname,
        title,
        description,
        topics: keywords.length > 0 ? keywords : extractTopicsFromContent(truncatedContent),
        entities: [],
        context: 'private',
        ingested_at: new Date().toISOString(),
      },
    };

    // Insert into documents table
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        team_id: teamId,
        file_name: documentData.fileName,
        content: documentData.content,
        metadata: documentData.metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to insert document:', error);
      return NextResponse.json({ error: "Failed to index content" }, { status: 500 });
    }

    // Optionally trigger n8n enrichment webhook
    const webhookUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            documentId: data.id,
            fileName: documentData.fileName,
            content: truncatedContent,
            source: 'website',
            url,
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
      title: documentData.fileName,
      contentLength: truncatedContent.length,
    });

  } catch (error) {
    console.error("Website ingestion error:", error);
    return NextResponse.json({ 
      error: "Failed to process website" 
    }, { status: 500 });
  }
}

// Simple topic extraction from content
function extractTopicsFromContent(content: string): string[] {
  // Extract potential topics from the content
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  
  // Count word frequency (skip common words)
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
    // Skip short words, numbers, and stop words
    if (word.length < 4 || /^\d+$/.test(word) || stopWords.has(word)) continue;
    
    // Clean the word
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length < 4) continue;
    
    wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
  }
  
  // Get top 10 most frequent words as topics
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sortedWords;
}
