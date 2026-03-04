"use client";

import { useEffect, useState } from 'react';
import { KnowledgeBaseView } from '@/components/dashboard/analytics/KnowledgeBaseView';
import { ConfidenceAnalyticsView } from '@/components/dashboard/analytics/ConfidenceAnalyticsView';
import { ResponseQualityAnalyticsView } from '@/components/dashboard/analytics/ResponseQualityAnalyticsView';
import { ContentRecommendationsView } from '@/components/dashboard/analytics/ContentRecommendationsView';
import SectionTitle from '@/components/dashboard/sectionTitle';
import { Loader2, Database, BarChart3, Lightbulb } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    // Get team ID from cookie
    const teamIdFromCookie = document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1] || '';
    setTeamId(teamIdFromCookie);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No team selected</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-screen-2xl mx-auto flex flex-col">
      <div className="px-6 pt-6">
        <SectionTitle 
          title="Analytics" 
          badgeText="Real-time" 
          badgeLabel="Insights" 
        />
      </div>
      
      <Tabs defaultValue="knowledge" className="flex-1 flex flex-col">
        <div className="px-6 pb-2">
          <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="knowledge" className="h-full m-0 data-[state=active]:flex flex-col">
            <KnowledgeBaseView teamId={teamId} />
          </TabsContent>

          <TabsContent value="quality" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto">
            <div className="py-4 space-y-8">
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-6 mb-3">Chat Confidence</h2>
                <ConfidenceAnalyticsView teamId={teamId} />
              </section>
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-6 mb-3">Response Quality</h2>
                <ResponseQualityAnalyticsView teamId={teamId} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="h-full m-0 data-[state=active]:flex flex-col overflow-y-auto">
            <div className="py-4">
              <ContentRecommendationsView teamId={teamId} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
