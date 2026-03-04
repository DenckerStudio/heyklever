import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

// Simple HTML to text converter
function htmlToText(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Generate hash from content
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Extract metadata from HTML
function extractMetadata(html: string, url: string): {
  title: string;
  description: string;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
  
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  
  return { title, description };
}

// Check a single URL for changes
async function checkUrl(
  supabase: any,
  urlRecord: {
    id: string;
    url: string;
    team_id: string;
    last_content_hash: string | null;
  }
): Promise<{ changed: boolean; error?: string }> {
  try {
    // Fetch the URL content
    const response = await fetch(urlRecord.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KleverAI/1.0; +https://heyklever.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const content = htmlToText(html);
    const contentHash = generateContentHash(content);

    // Check if content has changed
    const hasChanged = urlRecord.last_content_hash !== null && 
                       urlRecord.last_content_hash !== contentHash;

    // Update the URL record
    await supabase
      .from('monitored_urls')
      .update({
        last_checked_at: new Date().toISOString(),
        last_content_hash: contentHash,
        has_changes: hasChanged,
      })
      .eq('id', urlRecord.id);

    // If content changed, update the RAG knowledge base
    if (hasChanged) {
      const { title, description } = extractMetadata(html, urlRecord.url);
      const truncatedContent = content.substring(0, 50000);

      // Check if we already have a document for this URL
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('team_id', urlRecord.team_id)
        .eq('metadata->>url', urlRecord.url)
        .maybeSingle();

      if (existingDoc) {
        // Update existing document
        await supabase
          .from('documents')
          .update({
            content: truncatedContent,
            file_name: title,
            metadata: {
              source: 'monitored-url',
              url: urlRecord.url,
              title,
              description,
              context: 'private',
              updated_at: new Date().toISOString(),
            },
          })
          .eq('id', existingDoc.id);
      } else {
        // Insert new document
        await supabase
          .from('documents')
          .insert({
            team_id: urlRecord.team_id,
            file_name: title,
            content: truncatedContent,
            metadata: {
              source: 'monitored-url',
              url: urlRecord.url,
              title,
              description,
              context: 'private',
              ingested_at: new Date().toISOString(),
            },
          });
      }

      // Trigger n8n enrichment if available
      const webhookUrl = process.env.N8N_STORAGE_INGEST_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teamId: urlRecord.team_id,
              fileName: title,
              content: truncatedContent,
              source: 'monitored-url',
              url: urlRecord.url,
            }),
          });
        } catch (e) {
          console.error('Failed to trigger enrichment webhook:', e);
        }
      }
    }

    return { changed: hasChanged };

  } catch (error) {
    console.error(`Failed to check URL ${urlRecord.url}:`, error);
    return { changed: false, error: (error as Error).message };
  }
}

// POST: Check URL(s) for changes
// Can be called with a specific urlId or for all due URLs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { urlId, checkAll = false } = body;

    const supabase = await createSupabaseServerClient();

    // If specific URL ID provided, check just that one
    if (urlId) {
      const { data: urlRecord, error } = await supabase
        .from('monitored_urls')
        .select('id, url, team_id, last_content_hash')
        .eq('id', urlId)
        .eq('is_active', true)
        .single();

      if (error || !urlRecord) {
        return NextResponse.json({ error: "URL not found or inactive" }, { status: 404 });
      }

      const result = await checkUrl(supabase, urlRecord);

      return NextResponse.json({
        success: true,
        checked: 1,
        changed: result.changed ? 1 : 0,
        results: [{ id: urlId, ...result }],
      });
    }

    // Check all URLs that are due for checking
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build query for URLs due for checking
    let query = supabase
      .from('monitored_urls')
      .select('id, url, team_id, last_content_hash, check_frequency, last_checked_at')
      .eq('is_active', true);

    if (!checkAll) {
      // Only check URLs that are due
      query = query.or(
        `last_checked_at.is.null,` +
        `and(check_frequency.eq.daily,last_checked_at.lt.${oneDayAgo.toISOString()}),` +
        `and(check_frequency.eq.weekly,last_checked_at.lt.${oneWeekAgo.toISOString()})`
      );
    }

    const { data: urlsToCheck, error } = await query.limit(50);

    if (error) {
      console.error('Failed to fetch URLs to check:', error);
      return NextResponse.json({ error: "Failed to fetch URLs" }, { status: 500 });
    }

    if (!urlsToCheck || urlsToCheck.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        changed: 0,
        message: "No URLs due for checking",
      });
    }

    // Check each URL
    const results = await Promise.all(
      urlsToCheck.map((urlRecord) => checkUrl(supabase, urlRecord).then(result => ({
        id: urlRecord.id,
        url: urlRecord.url,
        ...result,
      })))
    );

    const changedCount = results.filter(r => r.changed).length;

    return NextResponse.json({
      success: true,
      checked: results.length,
      changed: changedCount,
      results,
    });

  } catch (error) {
    console.error("Monitored URLs check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
