"use client";

import { useEffect, useState } from "react";
import { KnowledgeBaseView } from "@/components/dashboard/analytics/KnowledgeBaseView";
import { ConfidenceAnalyticsView } from "@/components/dashboard/analytics/ConfidenceAnalyticsView";
import { ResponseQualityAnalyticsView } from "@/components/dashboard/analytics/ResponseQualityAnalyticsView";
import { ContentRecommendationsView } from "@/components/dashboard/analytics/ContentRecommendationsView";
import {
  Loader2,
  Database,
  BarChart3,
  Lightbulb,
  Activity,
  BrainCircuit,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type TabId = "knowledge" | "quality" | "recommendations";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "knowledge", label: "Knowledge Base", icon: Database, description: "Topics, documents & insights" },
  { id: "quality", label: "Quality", icon: BarChart3, description: "Confidence & response metrics" },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb, description: "AI-powered suggestions" },
];

export function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("knowledge");

  useEffect(() => {
    const teamIdFromCookie =
      document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1] || "";
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-6 pb-4 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Activity className="w-3 h-3" />
                Real-time
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor your AI knowledge base, response quality, and content
              health.
            </p>
          </div>

          {/* Mini stat pills */}
          <div className="hidden md:flex items-center gap-2">
            <StatPill icon={BrainCircuit} label="AI-Powered" />
            <StatPill icon={ShieldCheck} label="Auto-refresh" />
          </div>
        </motion.div>

        {/* ── Tab bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex gap-2"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "knowledge" && (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <KnowledgeBaseView teamId={teamId} />
          </motion.div>
        )}

        {activeTab === "quality" && (
          <motion.div
            key="quality"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="h-full overflow-y-auto"
          >
            <div className="px-6 py-4 space-y-8 max-w-screen-xl mx-auto">
              <QualitySection title="Chat Confidence" description="How confidently your AI answers user questions">
                <ConfidenceAnalyticsView teamId={teamId} />
              </QualitySection>
              <QualitySection title="Response Quality" description="Breakdown of successful vs failed responses">
                <ResponseQualityAnalyticsView teamId={teamId} />
              </QualitySection>
            </div>
          </motion.div>
        )}

        {activeTab === "recommendations" && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="h-full overflow-y-auto"
          >
            <div className="py-4">
              <ContentRecommendationsView teamId={teamId} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function QualitySection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        {children}
      </div>
    </section>
  );
}
