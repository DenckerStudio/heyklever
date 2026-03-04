import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { KnowledgeStats } from "@/components/ui/knowledge-stats";
import type { TopicData } from "@/components/ui/knowledge-visualization";

// Time period types
type TimePeriod = "today" | "week" | "month" | "year" | "all";

// Get date range for time period
function getDateRange(period: TimePeriod): { start: Date | null; end: Date } {
  const now = new Date();
  const end = now;
  
  switch (period) {
    case "today":
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return { start: startOfDay, end };
    case "week":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end };
    case "month":
      const startOfMonth = new Date(now);
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      startOfMonth.setHours(0, 0, 0, 0);
      return { start: startOfMonth, end };
    case "year":
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { start: startOfYear, end };
    case "all":
    default:
      return { start: null, end };
  }
}

// Default stats structure
const getDefaultStats = (): KnowledgeStats => ({
  totalDocuments: 0,
  totalTopics: 0,
  totalEntities: 0,
  publicDocuments: 0,
  privateDocuments: 0,
  totalFolders: 0,
  recentDocuments: [],
  visibilityBreakdown: {
    internal: 0,
    public: 0,
    restricted: 0,
  },
  clientAccess: [],
  featureDistribution: [],
  useCaseDistribution: [],
  riskSummary: {
    totalRisks: 0,
    documentsWithRisks: 0,
    topRisks: [],
  },
  languageDistribution: [],
});

// Calculate stats from documents
async function calculateStatsFromDocuments(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  teamId: string,
  dateRange: { start: Date | null; end: Date }
): Promise<{ stats: KnowledgeStats; topics: TopicData[] }> {
  console.log('Calculating stats from documents for team:', teamId);
  
  // Only fetch id and metadata - content is not needed for stats and is very large
  let documentsData: { id: string | number; metadata: Record<string, unknown> | string | null }[] = [];

  // Approach 1: Filter using JSONB arrow operator (most efficient)
  const { data: data1, error: error1 } = await supabase
    .from('documents')
    .select('id, metadata')
    .filter('metadata->>team_id', 'eq', teamId);

  if (data1 && !error1 && data1.length > 0) {
    documentsData = data1;
    console.log('Found documents using metadata->>team_id filter:', data1.length);
  } else {
    console.log('First approach result:', { data: data1?.length, error: error1?.message });
    
    // Approach 2: Use contains for JSONB
    const { data: data2, error: error2 } = await supabase
      .from('documents')
      .select('id, metadata')
      .contains('metadata', { team_id: teamId });

    if (data2 && !error2 && data2.length > 0) {
      documentsData = data2;
      console.log('Found documents using contains filter:', data2.length);
    } else {
      console.log('Second approach result:', { data: data2?.length, error: error2?.message });
      
      // Approach 3: Filter by object_path containing team_id
      const { data: data3, error: error3 } = await supabase
        .from('documents')
        .select('id, metadata')
        .ilike('metadata->>object_path', `%${teamId}%`);

      if (data3 && !error3 && Array.isArray(data3)) {
        documentsData = data3;
        console.log('Found documents using object_path filter:', data3.length);
      }
    }
  }

  if (documentsData.length === 0) {
    console.log('No documents found for team:', teamId);
    return { stats: getDefaultStats(), topics: [] };
  }

  // Process documents
  interface TopicMapEntry {
    count: number;
    visibilityScope: 'internal' | 'public' | 'restricted';
    folder?: string;
    files: Set<string>;
    documents: { id: string; fileName: string; createdAt: string }[];
  }
  
  const topicMap = new Map<string, TopicMapEntry>();
  const entitySet = new Set<string>();
  const folderSet = new Set<string>();
  const visibilityCounts = { internal: 0, public: 0, restricted: 0 };
  const clientAccessMap = new Map<string, number>();
  const featureMap = new Map<string, number>();
  const useCaseMap = new Map<string, number>();
  const riskMap = new Map<string, number>();
  let documentsWithRisks = 0;
  let totalRisks = 0;
  const languageMap = new Map<string, number>();
  const uniqueFiles = new Set<string>();
  const fileMetadataMap = new Map<string, {
    fileName: string;
    folderPath?: string;
    visibilityScope: string;
    createdAt: string;
    fileId: string;
  }>();
  const processedDocs: { id: string; fileName: string; createdAt: string; context: 'public' | 'private' }[] = [];

  for (const doc of documentsData) {
    // Parse metadata
    let metadata: Record<string, unknown> = {};
    if (typeof doc.metadata === 'string') {
      try {
        metadata = JSON.parse(doc.metadata);
      } catch {
        metadata = {};
      }
    } else if (doc.metadata && typeof doc.metadata === 'object') {
      metadata = doc.metadata as Record<string, unknown>;
    }

    // Filter by date if needed
    if (dateRange.start) {
      const enrichedAt = metadata.enriched_at as string | undefined;
      if (enrichedAt) {
        const docDate = new Date(enrichedAt);
        if (docDate < dateRange.start || docDate > dateRange.end) {
          continue; // Skip documents outside date range
        }
      }
    }

    const docTopics = Array.isArray(metadata.topics) ? metadata.topics as string[] : [];
    const docEntities = Array.isArray(metadata.entities) ? metadata.entities as string[] : [];
    const objectPath = metadata.object_path as string | undefined;
    const folderPath = objectPath?.split('/').slice(0, -1).join('/') || '';
    
    // Use file_id as unique identifier
    const fileId = (metadata.file_id as string) || objectPath || (metadata.file_name as string) || `unknown_${doc.id}`;
    
    // Track unique files for file-level metrics
    if (!uniqueFiles.has(fileId)) {
      uniqueFiles.add(fileId);
      
      const visibilityScope = (metadata.visibility_scope as string) || 'internal';
      if (visibilityScope === 'internal' || visibilityScope === 'public' || visibilityScope === 'restricted') {
        visibilityCounts[visibilityScope]++;
      }
      
      // Client access tracking
      if (visibilityScope === 'restricted') {
        let clientCodes: string[] = [];
        const allowedClientCodes = metadata.allowed_client_codes;
        if (Array.isArray(allowedClientCodes)) {
          clientCodes = allowedClientCodes as string[];
        } else if (typeof allowedClientCodes === 'string') {
          try {
            const parsed = JSON.parse(allowedClientCodes);
            if (Array.isArray(parsed)) {
              clientCodes = parsed;
            }
          } catch {
            clientCodes = [];
          }
        }
        
        for (const clientCode of clientCodes) {
          if (clientCode && typeof clientCode === 'string') {
            clientAccessMap.set(clientCode, (clientAccessMap.get(clientCode) || 0) + 1);
          }
        }
      }
      
      // Store file metadata
      fileMetadataMap.set(fileId, {
        fileName: (metadata.file_name as string) || 'Unknown',
        folderPath: folderPath || undefined,
        visibilityScope,
        createdAt: (metadata.enriched_at as string) || new Date().toISOString(),
        fileId,
      });
      
      // Track files with risks
      const risksOrPitfalls = metadata.risks_or_pitfalls;
      if (Array.isArray(risksOrPitfalls) && risksOrPitfalls.length > 0) {
        documentsWithRisks++;
      }
      
      // Language tracking
      const language = (metadata.language as string) || 'unknown';
      languageMap.set(language, (languageMap.get(language) || 0) + 1);
      
      // Feature tracking
      const feature = metadata.feature as string | undefined;
      if (feature && typeof feature === 'string') {
        featureMap.set(feature, (featureMap.get(feature) || 0) + 1);
      }
      
      // Use case tracking
      const useCase = metadata.use_case as string | undefined;
      if (useCase && typeof useCase === 'string') {
        useCaseMap.set(useCase, (useCaseMap.get(useCase) || 0) + 1);
      }
    }
    
    // Process ALL chunks for aggregation metrics
    const risksOrPitfalls = metadata.risks_or_pitfalls;
    if (Array.isArray(risksOrPitfalls) && risksOrPitfalls.length > 0) {
      totalRisks += risksOrPitfalls.length;
      for (const risk of risksOrPitfalls) {
        if (risk && typeof risk === 'string') {
          riskMap.set(risk, (riskMap.get(risk) || 0) + 1);
        }
      }
    }
    
    if (folderPath) folderSet.add(folderPath);
    for (const entity of docEntities) {
      if (entity && typeof entity === 'string') {
        entitySet.add(entity);
      }
    }
    
    // Process topics
    for (const topic of docTopics) {
      if (topic && typeof topic === 'string') {
        const existing = topicMap.get(topic);
        const fileInfo = fileMetadataMap.get(fileId);
        
        if (existing) {
          const fileAlreadyAdded = existing.files.has(fileId);
          if (!fileAlreadyAdded) {
            existing.count++;
            existing.files.add(fileId);
            existing.documents.push({
              id: fileId,
              fileName: fileInfo?.fileName || (metadata.file_name as string) || 'Unknown',
              createdAt: fileInfo?.createdAt || (metadata.enriched_at as string) || new Date().toISOString(),
            });
          }
        } else {
          const filesSet = new Set<string>();
          filesSet.add(fileId);
          topicMap.set(topic, {
            count: 1,
            visibilityScope: (fileInfo?.visibilityScope || 'internal') as 'internal' | 'public' | 'restricted',
            folder: fileInfo?.folderPath || folderPath,
            files: filesSet,
            documents: [{
              id: fileId,
              fileName: fileInfo?.fileName || (metadata.file_name as string) || 'Unknown',
              createdAt: fileInfo?.createdAt || (metadata.enriched_at as string) || new Date().toISOString(),
            }],
          });
        }
      }
    }
  }

  // Build processedDocs from unique files
  for (const fileInfo of fileMetadataMap.values()) {
    processedDocs.push({
      id: fileInfo.fileId,
      fileName: fileInfo.fileName,
      createdAt: fileInfo.createdAt,
      context: fileInfo.visibilityScope === 'public' ? 'public' : 'private',
    });
  }

  // Process topics - limit to top 50 for performance
  const processedTopics: TopicData[] = Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      context: (data.visibilityScope === 'public' ? 'public' : 'private') as 'public' | 'private',
      folder: data.folder,
      // Limit documents per topic to 10 for performance
      documents: data.documents.slice(0, 10),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // Limit to top 50 topics

  // Process client access
  const clientAccess = Array.from(clientAccessMap.entries())
    .map(([clientCode, documentCount]) => ({ clientCode, documentCount }))
    .sort((a, b) => b.documentCount - a.documentCount);

  // Process feature distribution
  const featureDistribution = Array.from(featureMap.entries())
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Process use case distribution
  const useCaseDistribution = Array.from(useCaseMap.entries())
    .map(([useCase, count]) => ({ useCase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Process top risks
  const topRisks = Array.from(riskMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([risk]) => risk);

  // Process language distribution
  const totalDocs = processedDocs.length;
  const languageDistribution = Array.from(languageMap.entries())
    .map(([language, count]) => ({
      language,
      count,
      percentage: totalDocs > 0 ? Math.round((count / totalDocs) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const stats: KnowledgeStats = {
    totalDocuments: processedDocs.length,
    totalTopics: processedTopics.length,
    totalEntities: entitySet.size,
    publicDocuments: visibilityCounts.public,
    privateDocuments: visibilityCounts.internal + visibilityCounts.restricted,
    totalFolders: folderSet.size,
    recentDocuments: processedDocs.slice(0, 10),
    visibilityBreakdown: visibilityCounts,
    clientAccess,
    featureDistribution,
    useCaseDistribution,
    riskSummary: {
      totalRisks,
      documentsWithRisks,
      topRisks,
    },
    languageDistribution,
  };

  return { stats, topics: processedTopics };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    
    // Get parameters from query
    const searchParams = req.nextUrl.searchParams;
    const teamId = searchParams.get("teamId") || cookieStore.get("team_id")?.value;
    const period = (searchParams.get("period") || "all") as TimePeriod;
    const live = searchParams.get("live") === "true"; // Force live calculation

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const dateRange = getDateRange(period);

    // If live mode or specific time period, calculate from documents directly
    if (live || period !== "all") {
      console.log(`Calculating live stats for period: ${period}`);
      const { stats, topics } = await calculateStatsFromDocuments(supabase, teamId, dateRange);
      
      const response = NextResponse.json({
        stats,
        topics,
        calculatedAt: new Date().toISOString(),
        period,
        isLive: true,
      });
      // Cache live data for 30 seconds
      response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
      return response;
    }

    // Try to fetch pre-calculated analytics first
    const { data, error } = await supabase
      .from("knowledge_analytics")
      .select("stats, calculated_at")
      .eq("team_id", teamId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching analytics:", error);
      // Fall back to live calculation
      const { stats, topics } = await calculateStatsFromDocuments(supabase, teamId, dateRange);
      return NextResponse.json({
        stats,
        topics,
        calculatedAt: new Date().toISOString(),
        period,
        isLive: true,
      });
    }

    // If no pre-calculated analytics exist, calculate live
    if (!data) {
      console.log("No pre-calculated analytics found, calculating live...");
      const { stats, topics } = await calculateStatsFromDocuments(supabase, teamId, dateRange);
      return NextResponse.json({
        stats,
        topics,
        calculatedAt: new Date().toISOString(),
        period,
        isLive: true,
      });
    }

    // Parse JSONB field
    let statsData: Record<string, unknown> = typeof data.stats === 'string' 
      ? JSON.parse(data.stats) 
      : data.stats;
    
    // Handle case where statsData might be an array
    if (Array.isArray(statsData)) {
      if (statsData.length > 0 && typeof statsData[0] === 'object' && !Array.isArray(statsData[0])) {
        statsData = statsData[0] as Record<string, unknown>;
      } else {
        // Invalid format, calculate live
        const { stats, topics } = await calculateStatsFromDocuments(supabase, teamId, dateRange);
        return NextResponse.json({
          stats,
          topics,
          calculatedAt: new Date().toISOString(),
          period,
          isLive: true,
        });
      }
    }
    
    // Ensure statsData is an object
    if (!statsData || typeof statsData !== 'object') {
      const { stats, topics } = await calculateStatsFromDocuments(supabase, teamId, dateRange);
      return NextResponse.json({
        stats,
        topics,
        calculatedAt: new Date().toISOString(),
        period,
        isLive: true,
      });
    }
    
    // Extract topics from stats object - limit to top 50 for performance
    const topics = Array.isArray(statsData.topics) 
      ? statsData.topics.slice(0, 50) 
      : [];

    // Remove topics from stats to match KnowledgeStats interface
    const { topics: _, ...statsWithoutTopics } = statsData;

    // Ensure all required fields are present with defaults
    const stats: KnowledgeStats = {
      totalDocuments: (statsWithoutTopics.totalDocuments as number) ?? 0,
      totalTopics: (statsWithoutTopics.totalTopics as number) ?? 0,
      totalEntities: (statsWithoutTopics.totalEntities as number) ?? 0,
      publicDocuments: (statsWithoutTopics.publicDocuments as number) ?? 0,
      privateDocuments: (statsWithoutTopics.privateDocuments as number) ?? 0,
      totalFolders: (statsWithoutTopics.totalFolders as number) ?? 0,
      recentDocuments: Array.isArray(statsWithoutTopics.recentDocuments) 
        ? statsWithoutTopics.recentDocuments as KnowledgeStats['recentDocuments']
        : [],
      visibilityBreakdown: statsWithoutTopics.visibilityBreakdown && typeof statsWithoutTopics.visibilityBreakdown === 'object'
        ? {
            internal: (statsWithoutTopics.visibilityBreakdown as Record<string, number>).internal ?? 0,
            public: (statsWithoutTopics.visibilityBreakdown as Record<string, number>).public ?? 0,
            restricted: (statsWithoutTopics.visibilityBreakdown as Record<string, number>).restricted ?? 0,
          }
        : {
            internal: 0,
            public: 0,
            restricted: 0,
          },
      clientAccess: Array.isArray(statsWithoutTopics.clientAccess) 
        ? statsWithoutTopics.clientAccess as KnowledgeStats['clientAccess']
        : [],
      featureDistribution: Array.isArray(statsWithoutTopics.featureDistribution) 
        ? statsWithoutTopics.featureDistribution as KnowledgeStats['featureDistribution']
        : [],
      useCaseDistribution: Array.isArray(statsWithoutTopics.useCaseDistribution) 
        ? statsWithoutTopics.useCaseDistribution as KnowledgeStats['useCaseDistribution']
        : [],
      riskSummary: statsWithoutTopics.riskSummary && typeof statsWithoutTopics.riskSummary === 'object'
        ? {
            totalRisks: (statsWithoutTopics.riskSummary as Record<string, unknown>).totalRisks as number ?? 0,
            documentsWithRisks: (statsWithoutTopics.riskSummary as Record<string, unknown>).documentsWithRisks as number ?? 0,
            topRisks: Array.isArray((statsWithoutTopics.riskSummary as Record<string, unknown>).topRisks) 
              ? (statsWithoutTopics.riskSummary as Record<string, unknown>).topRisks as string[]
              : [],
          }
        : {
            totalRisks: 0,
            documentsWithRisks: 0,
            topRisks: [],
          },
      languageDistribution: Array.isArray(statsWithoutTopics.languageDistribution) 
        ? statsWithoutTopics.languageDistribution as KnowledgeStats['languageDistribution']
        : [],
    };

    const response = NextResponse.json({
      stats,
      topics: topics as TopicData[],
      calculatedAt: data.calculated_at,
      period,
      isLive: false,
    });
    // Cache pre-calculated data for 5 minutes
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
