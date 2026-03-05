"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import {
  TopicCloud,
  type TopicData,
} from "@/components/ui/knowledge-visualization";
import {
  TotalDocumentsCard,
  TotalTopicsCard,
  TotalEntitiesCard,
  VisibilityScopeCard,
  ClientAccessCard,
  FeatureUseCaseCard,
  RiskAnalysisCard,
  LanguageDistributionCard,
  RecentActivityCard,
  type KnowledgeStats,
} from "@/components/ui/knowledge-stats";
import { DataIngestionPanel } from "@/components/ui/data-ingestion-panel";
import {
  KnowledgeSitemap,
  type DocumentInfo,
} from "@/components/ui/knowledge-sitemap";
import { KnowledgeVisualization3D } from "@/components/ui/knowledge-visualization-3d";
import { Sparkles, Map, Plus, RefreshCw, Loader2, Calendar, Clock, LayoutDashboard, FileText, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Time period type
type TimePeriod = "today" | "week" | "month" | "year" | "all";
type VisualizationMode = "3d" | "cloud";

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

// LocalStorage keys
const STORAGE_KEYS = {
  PERIOD: 'klever_analytics_period',
  VISUALIZATION: 'klever_analytics_visualization',
  CACHED_DATA: 'klever_analytics_cache',
  CACHE_TIMESTAMP: 'klever_analytics_cache_timestamp',
  CANVAS_COLLAPSED: 'klever_analytics_canvas_collapsed',
};

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Helper to safely access localStorage
const getStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked
  }
};

export interface KnowledgeBaseViewProps {
  teamId: string;
  initialStats?: KnowledgeStats;
  initialTopics?: TopicData[];
  initialDocuments?: DocumentInfo[];
}

const defaultStats: KnowledgeStats = {
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
};

export function KnowledgeBaseView({
  teamId,
  initialStats = defaultStats,
  initialTopics = [],
  initialDocuments = [],
}: KnowledgeBaseViewProps) {
  // Initialize state from localStorage or defaults
  const [stats, setStats] = useState<KnowledgeStats>(() => {
    // Try to load cached data first for instant display
    const cached = getStorageItem<{ stats: KnowledgeStats; topics: TopicData[]; documents: DocumentInfo[]; timestamp: number } | null>(
      `${STORAGE_KEYS.CACHED_DATA}_${teamId}`, 
      null
    );
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.stats;
    }
    return initialStats;
  });
  const [topics, setTopics] = useState<TopicData[]>(() => {
    const cached = getStorageItem<{ stats: KnowledgeStats; topics: TopicData[]; documents: DocumentInfo[]; timestamp: number } | null>(
      `${STORAGE_KEYS.CACHED_DATA}_${teamId}`, 
      null
    );
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.topics;
    }
    return initialTopics;
  });
  const [documents, setDocuments] = useState<DocumentInfo[]>(() => {
    const cached = getStorageItem<{ stats: KnowledgeStats; topics: TopicData[]; documents: DocumentInfo[]; timestamp: number } | null>(
      `${STORAGE_KEYS.CACHED_DATA}_${teamId}`, 
      null
    );
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.documents;
    }
    return initialDocuments;
  });
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>(() => 
    getStorageItem<VisualizationMode>(STORAGE_KEYS.VISUALIZATION, "3d")
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(() => {
    const cached = getStorageItem<{ timestamp: number } | null>(
      `${STORAGE_KEYS.CACHED_DATA}_${teamId}`, 
      null
    );
    return cached ? new Date(cached.timestamp) : new Date();
  });
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => 
    getStorageItem<TimePeriod>(STORAGE_KEYS.PERIOD, "month") // Default to last 30 days
  );
  const [canvasCollapsed, setCanvasCollapsed] = useState<boolean>(() =>
    getStorageItem<boolean>(STORAGE_KEYS.CANVAS_COLLAPSED, false)
  );
  const [isLiveData, setIsLiveData] = useState(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const toggleCanvasCollapsed = useCallback(() => {
    setCanvasCollapsed((prev) => {
      const next = !prev;
      setStorageItem(STORAGE_KEYS.CANVAS_COLLAPSED, next);
      return next;
    });
  }, []);

  // Fetch data from analytics API with time period support
  const fetchData = useCallback(async (period: TimePeriod = timePeriod, forceLive: boolean = false, isBackground: boolean = false) => {
    if (!teamId) return;
    
    // Only show loading state if not a background refresh
    if (!isBackground) {
    setIsRefreshing(true);
    }

    try {
      // Build URL with parameters
      const params = new URLSearchParams({
        teamId,
        period,
        ...(forceLive && { live: 'true' }),
      });
      
      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.stats) {
          const newStats = data.stats;
          const newTopics = data.topics || [];
          const timestamp = Date.now();
          
          // Build documents from recentDocuments for sitemap
          let newDocuments: DocumentInfo[] = [];
          if (data.stats.recentDocuments && Array.isArray(data.stats.recentDocuments)) {
            newDocuments = data.stats.recentDocuments.map((doc: { id: string; fileName: string; createdAt: string; context?: string }) => ({
              id: doc.id,
              fileName: doc.fileName,
              createdAt: doc.createdAt,
              visibilityScope: doc.context === 'public' ? 'public' : 'internal',
              topics: [],
              entities: [],
            }));
          }
          
          // Update state
          setStats(newStats);
          setTopics(newTopics);
          setDocuments(newDocuments);
          setIsLiveData(data.isLive || false);
          setLastRefresh(new Date(data.calculatedAt || timestamp));
          
          // Cache data in localStorage for instant display next time
          setStorageItem(`${STORAGE_KEYS.CACHED_DATA}_${teamId}`, {
            stats: newStats,
            topics: newTopics,
            documents: newDocuments,
            timestamp,
            period,
          });
          
          if (!isBackground) {
            setIsRefreshing(false);
          }
          return;
        }
      }
      
      // If API failed, log error
      console.error('Failed to fetch analytics from API');
      if (!isBackground) {
        setStats(defaultStats);
        setTopics([]);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      if (!isBackground) {
        setStats(defaultStats);
        setTopics([]);
      }
    } finally {
      if (!isBackground) {
      setIsRefreshing(false);
      }
    }
  }, [teamId, timePeriod]);

  // Handle time period change
  const handlePeriodChange = useCallback((newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setStorageItem(STORAGE_KEYS.PERIOD, newPeriod); // Save preference
    fetchData(newPeriod, newPeriod !== "all"); // Force live for non-all periods
  }, [fetchData]);

  // Handle visualization mode change
  const handleVisualizationChange = useCallback((mode: VisualizationMode) => {
    setVisualizationMode(mode);
    setStorageItem(STORAGE_KEYS.VISUALIZATION, mode); // Save preference
  }, []);

  // Initial fetch, auto-refresh, and real-time subscription
  useEffect(() => {
    // Check if we have valid cached data
    const cached = getStorageItem<{ timestamp: number; period: TimePeriod } | null>(
      `${STORAGE_KEYS.CACHED_DATA}_${teamId}`, 
      null
    );
    
    const cacheIsValid = cached && Date.now() - cached.timestamp < CACHE_DURATION;
    
    // If cache is stale or doesn't exist, fetch fresh data
    if (!cacheIsValid) {
      fetchData(timePeriod, timePeriod !== "all");
    } else {
      // Even with valid cache, do a background refresh to ensure data is current
      fetchData(timePeriod, timePeriod !== "all", true);
    }

    // Set up auto-refresh every 10 minutes
    autoRefreshRef.current = setInterval(() => {
      fetchData(timePeriod, timePeriod !== "all", true); // Background refresh
    }, AUTO_REFRESH_INTERVAL);

    // Set up real-time subscription
    if (!teamId) return;
    
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`documents-changes-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          // Check if the change is relevant to this team
          const metadata = payload.new && typeof payload.new === 'object' 
            ? (payload.new as { metadata?: { team_id?: string } }).metadata 
            : null;
          
          if (metadata?.team_id === teamId || !metadata) {
            // Refresh data when relevant documents change
            fetchData(timePeriod, true, true); // Background refresh with live data
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [teamId, fetchData, timePeriod]);

  const handleTopicClick = useCallback((topic: TopicData) => {
    setSelectedTopic(topic.topic);
  }, []);

  const handleDocumentClick = useCallback((doc: DocumentInfo) => {
    console.log("Document clicked:", doc);
  }, []);

  const handleIngestionSuccess = useCallback(() => {
    // Refresh data after successful ingestion
    fetchData();
  }, [fetchData]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with time period selector and refresh */}
      <div className="flex items-center justify-between px-6 py-3 gap-4 shrink-0">
        {/* Time period selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Period:</span>
          </div>
          <Select value={timePeriod} onValueChange={(value) => handlePeriodChange(value as TimePeriod)}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLiveData && (
            <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
              <Clock className="h-3 w-3" />
              Live
            </span>
          )}
        </div>

      {/* Refresh indicator */}
        <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2"
            onClick={() => fetchData(timePeriod, true)}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pb-4 shrink-0">
          <TabsList className="grid w-full grid-cols-2 max-w-[320px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TabsContent value="overview" className="m-0 h-full p-6 pt-0">
            <div className="space-y-6">
              {/* Knowledge Topics – collapsible + fullscreen canvas */}
              <KnowledgeTopicsCanvas
                topics={topics}
                teamId={teamId}
                collapsed={canvasCollapsed}
                onToggleCollapse={toggleCanvasCollapsed}
                visualizationMode={visualizationMode}
                selectedTopic={selectedTopic}
                onTopicClick={handleTopicClick}
              />

              {/* Stat cards */}
              <BentoGrid
                columns={{ mobile: 1, tablet: 2, desktop: 4 }}
                gap="gap-6"
              >
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[140px]">
                  <TotalDocumentsCard count={stats.totalDocuments} delay={0} />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[140px]">
                  <TotalTopicsCard count={stats.totalTopics} delay={0.1} />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[140px]">
                  <TotalEntitiesCard count={stats.totalEntities} delay={0.3} />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} title="Recent Activity" className="min-h-[140px]">
                  <RecentActivityCard documents={stats.recentDocuments} delay={0.8} />
                </BentoGridItem>
              </BentoGrid>

              {/* Analysis section (formerly Analysis tab) */}
              <BentoGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="gap-6">
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[200px]">
                  <VisibilityScopeCard visibilityBreakdown={stats.visibilityBreakdown} delay={0.2} />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[200px]">
                  <ClientAccessCard clientAccess={stats.clientAccess} delay={0.4} />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[200px]">
                  <RiskAnalysisCard riskSummary={stats.riskSummary} delay={0.6} />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 2, desktop: 2 }} className="min-h-[240px]">
                  <FeatureUseCaseCard
                    featureDistribution={stats.featureDistribution}
                    useCaseDistribution={stats.useCaseDistribution}
                    delay={0.5}
                  />
                </BentoGridItem>
                <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }} className="min-h-[200px]">
                  <LanguageDistributionCard languageDistribution={stats.languageDistribution} delay={0.7} />
                </BentoGridItem>
              </BentoGrid>
            </div>
          </TabsContent>

          <TabsContent value="content" className="m-0 h-full p-6 pt-0">
            <div className="space-y-6">
              {/* Add Knowledge – moved from Management */}
              <div className="rounded-xl border border-border/30 bg-muted/10 p-5">
                <div className="flex items-center gap-3 pb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Plus className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Add Knowledge</h3>
                    <p className="text-xs text-muted-foreground">Upload files, websites, or sitemaps</p>
                  </div>
                </div>
                <DataIngestionPanel teamId={teamId} onSuccess={handleIngestionSuccess} className="flex-1" />
              </div>

              {/* Knowledge Sitemap */}
              <BentoGrid columns={{ mobile: 1, tablet: 1, desktop: 1 }} gap="gap-6">
                <BentoGridItem expandable title="Knowledge Sitemap" className="min-h-[400px]">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center gap-3 pb-4">
                      <div className="p-2.5 rounded-xl bg-orange-500/10">
                        <Map className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Knowledge Sitemap</h3>
                        <p className="text-xs text-muted-foreground">Browse indexed documents</p>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 -mx-5 -mb-5">
                      <KnowledgeSitemap
                        documents={documents}
                        onDocumentClick={handleDocumentClick}
                        onTopicClick={(topic) => setSelectedTopic(topic)}
                        className="h-full"
                      />
                    </div>
                  </div>
                </BentoGridItem>
              </BentoGrid>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function KnowledgeTopicsCanvas({
  topics,
  teamId,
  collapsed,
  onToggleCollapse,
  visualizationMode,
  selectedTopic,
  onTopicClick,
}: {
  topics: TopicData[];
  teamId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  visualizationMode: "3d" | "cloud";
  selectedTopic: string | null;
  onTopicClick: (topic: TopicData) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const header = (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Knowledge Topics</h3>
          <p className="text-xs text-muted-foreground">{topics.length} topics discovered</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
        {!fullscreen && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  const canvas = (
    <div className={cn("relative w-full", fullscreen ? "flex-1 min-h-0" : "h-[480px]")}>
      {visualizationMode === "3d" ? (
        <KnowledgeVisualization3D
          topics={topics}
          teamId={teamId}
          onTopicClick={onTopicClick}
          selectedTopic={selectedTopic}
          className="w-full h-full"
          defaultMode="sphere"
          isFullscreen={fullscreen}
        />
      ) : (
        <div className="h-full overflow-y-auto p-4 pt-2">
          <TopicCloud topics={topics} onTopicClick={onTopicClick} selectedTopic={selectedTopic} />
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {header}
        {canvas}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-muted/20 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-foreground">Knowledge Topics</span>
              <span className="text-muted-foreground text-sm ml-2">· {topics.length} topics</span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-muted/20 overflow-hidden shadow-sm">
      {header}
      {canvas}
    </div>
  );
}
