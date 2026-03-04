"use client";

import React, { useState, useEffect } from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, HelpCircle, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EvaluationStats {
  period_hours: number;
  calculated_at: string;
  total_queries: number;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  success_counts: {
    success: number;
    failed: number;
    unknown: number;
  };
  success_rate: number;
  topics_performing_well: Array<{
    topic: string;
    query_count: number;
    high_ratio: number;
    confidence_breakdown: { high: number; medium: number; low: number };
  }>;
  topics_needing_attention: Array<{
    topic: string;
    query_count: number;
    recommendation_type: string;
    combined_score: number;
    confidence_breakdown: { high: number; medium: number; low: number };
  }>;
  recommended_actions_count: number;
}

interface ConfidenceAnalyticsViewProps {
  teamId: string;
}

export function ConfidenceAnalyticsView({ teamId }: ConfidenceAnalyticsViewProps) {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/analytics/evaluation?teamId=${teamId}&type=confidence`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasData && data.stats != null) {
            const raw =
              typeof data.stats === "string"
                ? (JSON.parse(data.stats) as Record<string, unknown>)
                : (data.stats as Record<string, unknown>);
            setStats({
              period_hours: (raw.period_hours as number) ?? 24,
              calculated_at: (raw.calculated_at as string) ?? "",
              total_queries: (raw.total_queries as number) ?? 0,
              confidence_distribution: {
                high: (raw.confidence_distribution as Record<string, number>)?.high ?? 0,
                medium: (raw.confidence_distribution as Record<string, number>)?.medium ?? 0,
                low: (raw.confidence_distribution as Record<string, number>)?.low ?? 0,
              },
              success_counts: {
                success: (raw.success_counts as Record<string, number>)?.success ?? 0,
                failed: (raw.success_counts as Record<string, number>)?.failed ?? 0,
                unknown: (raw.success_counts as Record<string, number>)?.unknown ?? 0,
              },
              success_rate: (raw.success_rate as number) ?? 0,
              topics_performing_well: Array.isArray(raw.topics_performing_well) ? raw.topics_performing_well as EvaluationStats["topics_performing_well"] : [],
              topics_needing_attention: Array.isArray(raw.topics_needing_attention) ? raw.topics_needing_attention as EvaluationStats["topics_needing_attention"] : [],
              recommended_actions_count: (raw.recommended_actions_count as number) ?? 0,
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
        <p>No confidence evaluation data available yet.</p>
        <p className="text-sm mt-2">Data is generated daily at 03:00 AM.</p>
      </div>
    );
  }

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
              <div className="text-3xl font-bold">{(stats.success_rate * 100).toFixed(1)}%</div>
              <Progress value={stats.success_rate * 100} className="h-2 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">
                Based on {stats.total_queries} queries
              </p>
            </CardContent>
          </Card>
        </BentoGridItem>

        {/* Confidence Distribution */}
        <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 1 }}>
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confidence Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> High</span>
                <span className="font-medium">{stats.confidence_distribution.high}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Medium</span>
                <span className="font-medium">{stats.confidence_distribution.medium}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Low</span>
                <span className="font-medium">{stats.confidence_distribution.low}</span>
              </div>
            </CardContent>
          </Card>
        </BentoGridItem>

        {/* Action Items */}
        <BentoGridItem span={{ mobile: 1, tablet: 1, desktop: 2 }}>
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-2 gap-4">
              <div className="bg-primary/5 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{stats.recommended_actions_count}</div>
                <div className="text-xs text-muted-foreground">Recommended Actions</div>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600">{stats.topics_performing_well.length}</div>
                <div className="text-xs text-muted-foreground">Top Performing Topics</div>
              </div>
            </CardContent>
          </Card>
        </BentoGridItem>

        {/* Topics Needing Attention */}
        <BentoGridItem 
          span={{ mobile: 1, tablet: 2, desktop: 2 }}
          title="Needs Attention"
          className="min-h-[300px]"
        >
          <div className="flex flex-col gap-3 mt-4">
            {stats.topics_needing_attention.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                No critical issues found today.
              </div>
            ) : (
              stats.topics_needing_attention.map((topic, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {topic.topic}
                      <Badge variant="outline" className="text-xs font-normal">
                        {topic.recommendation_type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {topic.query_count} queries • Low conf: {topic.confidence_breakdown.low + topic.confidence_breakdown.medium}
                    </div>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-1" />
                </div>
              ))
            )}
          </div>
        </BentoGridItem>

        {/* Topics Performing Well */}
        <BentoGridItem 
          span={{ mobile: 1, tablet: 2, desktop: 2 }}
          title="Performing Well"
          className="min-h-[300px]"
        >
          <div className="flex flex-col gap-3 mt-4">
            {stats.topics_performing_well.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No high-performing topics yet.
              </div>
            ) : (
              stats.topics_performing_well.map((topic, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/10">
                  <div>
                    <div className="font-medium">{topic.topic}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {topic.query_count} queries • {(topic.high_ratio * 100).toFixed(0)}% high confidence
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-500 mt-1" />
                </div>
              ))
            )}
          </div>
        </BentoGridItem>
      </BentoGrid>
    </div>
  );
}
