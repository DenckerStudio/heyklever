import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();

    // Get parameters from query
    const searchParams = req.nextUrl.searchParams;
    const teamId = searchParams.get("teamId") || cookieStore.get("team_id")?.value;
    const topic = searchParams.get("topic");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Query documents that contain this topic in their metadata
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, content, metadata")
      .filter("metadata->>team_id", "eq", teamId)
      .limit(limit * 2); // Fetch more to filter by topic

    if (error) {
      console.error("Error fetching chunks:", error);
      return NextResponse.json(
        { error: "Failed to fetch chunks" },
        { status: 500 }
      );
    }

    // Filter documents that contain the requested topic
    const topicLower = topic.toLowerCase();
    const filteredDocs = (documents || []).filter((doc) => {
      if (!doc.metadata) return false;
      
      const metadata = typeof doc.metadata === "string" 
        ? JSON.parse(doc.metadata) 
        : doc.metadata;
      
      const topics = Array.isArray(metadata.topics) ? metadata.topics : [];
      return topics.some((t: string) => 
        t.toLowerCase() === topicLower || 
        t.toLowerCase().includes(topicLower) ||
        topicLower.includes(t.toLowerCase())
      );
    });

    // Transform to chunk format
    const chunks = filteredDocs.slice(0, limit).map((doc) => {
      const metadata = typeof doc.metadata === "string" 
        ? JSON.parse(doc.metadata) 
        : doc.metadata;
      
      return {
        id: String(doc.id),
        content: doc.content || "",
        chunk_summary: metadata?.chunk_summary || null,
        fileName: metadata?.file_name || metadata?.fileName || "Unknown",
        relevance: calculateRelevance(doc.content || "", topic),
      };
    });

    // Sort by relevance
    chunks.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

    return NextResponse.json({
      chunks,
      topic,
      totalChunks: chunks.length,
    });
  } catch (error) {
    console.error("Chunks API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Calculate relevance score based on topic occurrence in content
function calculateRelevance(content: string, topic: string): number {
  if (!content || !topic) return 0;
  
  const contentLower = content.toLowerCase();
  const topicLower = topic.toLowerCase();
  const words = topicLower.split(/\s+/);
  
  let score = 0;
  
  // Exact match bonus
  if (contentLower.includes(topicLower)) {
    score += 0.5;
  }
  
  // Word match scoring
  words.forEach((word) => {
    if (word.length > 2) {
      const regex = new RegExp(word, "gi");
      const matches = content.match(regex);
      if (matches) {
        score += Math.min(0.1 * matches.length, 0.3);
      }
    }
  });
  
  // Normalize to 0-1 range
  return Math.min(1, score);
}
