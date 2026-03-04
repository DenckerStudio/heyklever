"use client";

import React, { useState, useEffect } from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Activity, Globe, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ContextStats {
  total: number;
  success: number;
  failed: number;
}

interface ResponseQualityStats {
  period_hours: number;
  calculated_at: string;
  total_queries: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  by_context: {
    public: ContextStats;
    private: ContextStats;
  };
  by_confidence: {
    high: ContextStats;
    medium: ContextStats;
    low: ContextStats;
  };
}

interface ResponseQualityAnalyticsViewProps {
  teamId: string;
}

export function ResponseQualityAnalyticsView({ teamId }: ResponseQualityAnalyticsViewProps) {
  const [stats, setStats] = useState<ResponseQualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/analytics/evaluation?teamId=${teamId}&type=response_quality`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasData && data.stats != null) {
            const raw =
              typeof data.stats === "string"
                ? (JSON.parse(data.stats) as Record<string, unknown>)
                : (data.stats as Record<string, unknown>);
            
            const defaultContext: ContextStats = { total: 0, success: 0, failed: 0 };
            const byContextRaw = raw.by_context as Record<string, ContextStats> | undefined;
            const byConfidenceRaw = raw.by_confidence as Record<string, ContextStats> | undefined;
            
            setStats({
              period_hours: (raw.period_hours as number) ?? 24,
              calculated_at: (raw.calculated_at as string) ?? "",
              total_queries: (raw.total_queries as number) ?? 0,
              success_count: (raw.success_count as number) ?? 0,
              failed_count: (raw.failed_count as number) ?? 0,
              success_rate: (raw.success_rate as number) ?? 0,
              by_context: {
                public: byContextRaw?.public ?? defaultContext,
                private: byContextRaw?.private ?? defaultContext,
              },
              by_confidence: {
                high: byConfidenceRaw?.high ?? defaultContext,
                medium: byConfidenceRaw?.medium ?? defaultContext,
                low: byConfidenceRaw?.low ?? defaultContext,
              },
            });
          }
        } else {
          setError("Failed to fetch data");
        }
      } catch (err) {
        setError("Error connecting to server");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Activity className="h-12 w-12 mb-4 opacity-20" />
        <p>No response quality data available yet.</p>
        <p className="text-sm mt-2">Data is generated daily at 03:15 AM.</p>
      </div>
    );
  }

  const successRatePercent = (stats.success_rate * 100).toFixed(1);

  return (
    <div className="w-full h-full px-6 pb-6">
      <BentoGrid
        columns={{ mobile: 1, tablet: 2, desktop: 4 }}
        gap="gap-6"
      >
        {/* Success Rate Card */}
        <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }}>
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate (24h)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-3xl font-bold">{successRatePercent}%</div>
              <Progress value={stats.success_rate * 100} className="h-2 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">
                Based on {stats.total_queries} queries
              </p>
            </CardContent>
          </Card>
        </BentoGridItem>

        {/* Success/Failed Counts */}
        <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }}>
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Query Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Successful
                </span>
                <span className="font-semibold text-emerald-600">{stats.success_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Failed
                </span>
                <span className="font-semibold text-red-600">{stats.failed_count}</span>
              </div>
            </CardContent>
          </Card>
        </BentoGridItem>

        {/* By Context */}
        <BentoGridItem span={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">By Context</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-2 gap-4">
              {/* Public */}
              <div className="bg-blue-500/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Public</span>
                </div>
                <div className="text-2xl font-bold">{stats.by_context.public.total}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.by_context.public.success} success, {stats.by_context.public.failed} failed
                </div>
                {stats.by_context.public.total > 0 && (
                  <Progress 
                    value={(stats.by_context.public.success / stats.by_context.public.total) * 100} 
                    className="h-1.5 mt-2" 
                  />
                )}
              </div>
              
              {/* Private */}
              <div className="bg-purple-500/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Private</span>
                </div>
                <div className="text-2xl font-bold">{stats.by_context.private.total}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.by_context.private.success} success, {stats.by_context.private.failed} failed
                </div>
                {stats.by_context.private.total > 0 && (
                  <Progress 
                    value={(stats.by_context.private.success / stats.by_context.private.total) * 100} 
                    className="h-1.5 mt-2" 
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </BentoGridItem>

        {/* By Confidence Level */}
        <BentoGridItem 
          span={{ mobile: 1, tablet: 2, desktop: 4 }}
          title="Success Rate by Confidence Level"
          className="min-h-[180px]"
        >
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* High Confidence */}
            <div className="bg-emerald-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">High Confidence</span>
              </div>
              <div className="text-xl font-bold">{stats.by_confidence.high.total} queries</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.by_confidence.high.success} success, {stats.by_confidence.high.failed} failed
              </div>
              {stats.by_confidence.high.total > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-emerald-600 font-medium">
                    {((stats.by_confidence.high.success / stats.by_confidence.high.total) * 100).toFixed(0)}% success rate
                  </div>
                  <Progress 
                    value={(stats.by_confidence.high.success / stats.by_confidence.high.total) * 100} 
                    className="h-1.5 mt-1" 
                  />
                </div>
              )}
            </div>

            {/* Medium Confidence */}
            <div className="bg-yellow-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">Medium Confidence</span>
              </div>
              <div className="text-xl font-bold">{stats.by_confidence.medium.total} queries</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.by_confidence.medium.success} success, {stats.by_confidence.medium.failed} failed
              </div>
              {stats.by_confidence.medium.total > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-yellow-600 font-medium">
                    {((stats.by_confidence.medium.success / stats.by_confidence.medium.total) * 100).toFixed(0)}% success rate
                  </div>
                  <Progress 
                    value={(stats.by_confidence.medium.success / stats.by_confidence.medium.total) * 100} 
                    className="h-1.5 mt-1" 
                  />
                </div>
              )}
            </div>

            {/* Low Confidence */}
            <div className="bg-red-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Low Confidence</span>
              </div>
              <div className="text-xl font-bold">{stats.by_confidence.low.total} queries</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.by_confidence.low.success} success, {stats.by_confidence.low.failed} failed
              </div>
              {stats.by_confidence.low.total > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-red-600 font-medium">
                    {((stats.by_confidence.low.success / stats.by_confidence.low.total) * 100).toFixed(0)}% success rate
                  </div>
                  <Progress 
                    value={(stats.by_confidence.low.success / stats.by_confidence.low.total) * 100} 
                    className="h-1.5 mt-1" 
                  />
                </div>
              )}
            </div>
          </div>
        </BentoGridItem>
      </BentoGrid>
    </div>
  );
}
