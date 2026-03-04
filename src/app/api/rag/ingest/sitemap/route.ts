import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Parse sitemap XML and extract URLs
function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  
  // Match <loc> tags in sitemap
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let match;
  
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url) {
      urls.push(url);
    }
  }
  
  return urls;
}

// Check if URL is a sitemap index (contains other sitemaps)
function isSitemapIndex(xml: string): boolean {
  return xml.includes('<sitemapindex') || xml.includes('sitemap>');
}

// Parse sitemap index and get sitemap URLs
function parseSitemapIndex(xml: string): string[] {
  const sitemaps: string[] = [];
  
  // Match <sitemap><loc>...</loc></sitemap> patterns
  const sitemapRegex = /<sitemap>[\s\S]*?<loc>\s*([^<]+)\s*<\/loc>[\s\S]*?<\/sitemap>/gi;
  let match;
  
  while ((match = sitemapRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url) {
      sitemaps.push(url);
    }
  }
  
  return sitemaps;
}

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

// Extract title from HTML
function extractTitle(html: string, url: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : new URL(url).pathname || url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sitemapUrl, teamId: bodyTeamId, parseOnly, selectedUrls } = body;

    if (!sitemapUrl) {
      return NextResponse.json({ error: "Sitemap URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sitemapUrl);
    } catch {
      return NextResponse.json({ error: "Invalid sitemap URL format" }, { status: 400 });
    }

    // Get team ID from cookie or body
    const cookieStore = await cookies();
    const teamId = bodyTeamId || cookieStore.get("team_id")?.value;

    // Fetch the sitemap
    let xml: string;
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KleverAI/1.0; +https://heyklever.com/bot)',
          'Accept': 'application/xml,text/xml,*/*;q=0.1',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      xml = await response.text();
    } catch (error) {
      return NextResponse.json({ 
        error: "Failed to fetch sitemap. Make sure the URL is accessible." 
      }, { status: 400 });
    }

    // Parse the sitemap
    let urls: string[] = [];

    if (isSitemapIndex(xml)) {
      // It's a sitemap index, fetch child sitemaps
      const sitemapUrls = parseSitemapIndex(xml);
      
      for (const childSitemapUrl of sitemapUrls.slice(0, 10)) { // Limit to 10 child sitemaps
        try {
          const childResponse = await fetch(childSitemapUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; KleverAI/1.0; +https://heyklever.com/bot)',
            },
            signal: AbortSignal.timeout(15000),
          });
          
          if (childResponse.ok) {
            const childXml = await childResponse.text();
            urls.push(...parseSitemap(childXml));
          }
        } catch {
          // Skip failed child sitemaps
          continue;
        }
      }
    } else {
      urls = parseSitemap(xml);
    }

    // Limit URLs
    urls = urls.slice(0, 200); // Max 200 URLs

    // If parseOnly, just return the URLs
    if (parseOnly) {
      return NextResponse.json({
        success: true,
        urls,
        count: urls.length,
      });
    }

    // If no team ID for processing, return error
    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Filter to selected URLs if provided
    const urlsToProcess = selectedUrls && Array.isArray(selectedUrls) && selectedUrls.length > 0
      ? urls.filter(u => selectedUrls.includes(u))
      : urls;

    // Process each URL
    const supabase = await createSupabaseServerClient();
    const results: { url: string; success: boolean; error?: string }[] = [];

    for (const url of urlsToProcess.slice(0, 50)) { // Max 50 pages at a time
      try {
        // Fetch the page
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KleverAI/1.0; +https://heyklever.com/bot)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!pageResponse.ok) {
          results.push({ url, success: false, error: `HTTP ${pageResponse.status}` });
          continue;
        }

        const html = await pageResponse.text();
        const content = htmlToText(html);
        const title = extractTitle(html, url);

        // Insert into documents
        const { error } = await supabase
          .from('documents')
          .insert({
            team_id: teamId,
            file_name: title,
            content: content.substring(0, 50000), // Limit content size
            metadata: {
              source: 'sitemap',
              url: url,
              sitemap_url: sitemapUrl,
              hostname: parsedUrl.hostname,
              title,
              context: 'private',
              topics: [],
              entities: [],
              ingested_at: new Date().toISOString(),
            },
          });

        if (error) {
          results.push({ url, success: false, error: error.message });
        } else {
          results.push({ url, success: true });
        }

      } catch (error) {
        results.push({ 
          url, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Small delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failedCount,
      results: results.slice(0, 10), // Return first 10 results for preview
    });

  } catch (error) {
    console.error("Sitemap ingestion error:", error);
    return NextResponse.json({ 
      error: "Failed to process sitemap" 
    }, { status: 500 });
  }
}
