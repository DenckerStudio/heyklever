"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useDashboardNavigation } from "@/lib/contexts/DashboardViewContext";
import { motion } from "motion/react";
import {
  Search, FileText, BrainCircuit, Globe, BarChart3,
  Upload, MessageSquareText, ArrowUpRight, Loader2,
  Package, Monitor, FolderOpen, Sparkles, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OverviewStats {
  documents: number;
  topics: number;
  clientPages: number;
  teamMembers: number;
}

interface RecentDoc {
  id: string;
  fileName: string;
  createdAt: string;
  chunks: number;
}

export function OverviewView() {
  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState<OverviewStats>({ documents: 0, topics: 0, clientPages: 0, teamMembers: 0 });
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { navigateTo } = useDashboardNavigation();

  const teamId = typeof document !== "undefined"
    ? document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1] || ""
    : "";

  const fetchData = useCallback(async () => {
    if (!teamId) return;
    const supabase = createSupabaseBrowserClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(profile?.full_name || user.email?.split("@")[0] || "");
    }

    const [analyticsRes, clientUrlsRes, membersRes] = await Promise.all([
      fetch(`/api/analytics?teamId=${teamId}&period=all`).then(r => r.ok ? r.json() : null),
      fetch("/api/teams/client-urls").then(r => r.ok ? r.json() : null),
      supabase.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    ]);

    setStats({
      documents: analyticsRes?.stats?.totalDocuments ?? 0,
      topics: analyticsRes?.stats?.totalTopics ?? 0,
      clientPages: clientUrlsRes?.clientUrls?.length ?? 0,
      teamMembers: membersRes.count ?? 1,
    });

    const recent = (analyticsRes?.stats?.recentDocuments ?? []).slice(0, 5).map((d: { id: string; fileName: string; createdAt: string }) => ({
      id: d.id,
      fileName: d.fileName,
      createdAt: d.createdAt,
      chunks: 0,
    }));
    setRecentDocs(recent);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigateTo("notebook");
  };

  const STAT_CARDS: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; view: "notebook" | "analytics" | "team" }[] = [
    { label: "Documents", value: stats.documents, icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", view: "notebook" },
    { label: "Topics", value: stats.topics, icon: BrainCircuit, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", view: "analytics" },
    { label: "Client Pages", value: stats.clientPages, icon: Globe, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", view: "team" },
  ];

  const QUICK_ACTIONS = [
    { label: "Upload Files", icon: Upload, onClick: () => navigateTo("notebook") },
    { label: "Train AI", icon: Sparkles, onClick: () => navigateTo("train-ai") },
    { label: "Analytics", icon: BarChart3, onClick: () => navigateTo("analytics") },
    { label: "AI Chat", icon: MessageSquareText, onClick: () => navigateTo("notebook") },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Greeting + Search */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Hello{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1">Explore your knowledge base and manage your workspace.</p>
          </div>
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files, topics, or ask AI…"
              className="pl-10 h-11 rounded-xl bg-muted/40 border-border/50 focus:bg-background text-sm"
            />
          </form>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
                onClick={() => navigateTo(card.view)}
                className={cn(
                  "group relative rounded-2xl p-5 text-left transition-all duration-300",
                  "border border-border/40 hover:border-border hover:shadow-lg",
                  card.bg
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2.5 rounded-xl bg-background/80 border border-border/40 shadow-sm", card.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border/40 bg-card hover:border-border hover:shadow-md transition-all duration-200"
                >
                  <div className="p-2.5 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Documents + Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Recent Documents - spans 2 cols */}
          <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Recent Documents</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{recentDocs.length}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigateTo("notebook")}>
                View all
              </Button>
            </div>
            {recentDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No documents yet</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigateTo("notebook")}>
                  Upload your first file
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Info */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Your Workspace</h3>
            <div className="space-y-3">
              <InfoRow icon={Package} label="Team members" value={String(stats.teamMembers)} />
              <InfoRow icon={FileText} label="Documents indexed" value={String(stats.documents)} />
              <InfoRow icon={BrainCircuit} label="Topics discovered" value={String(stats.topics)} />
              <InfoRow icon={Globe} label="Client pages" value={String(stats.clientPages)} />
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={() => navigateTo("team")}>
              Manage Team
            </Button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
