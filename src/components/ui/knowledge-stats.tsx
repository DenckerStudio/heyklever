"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Sparkles, 
  Tag, 
  Globe, 
  Lock, 
  Clock, 
  TrendingUp,
  Database,
  Folder,
  Users,
  Shield,
  AlertTriangle,
  Languages,
  Layers,
  Target
} from "lucide-react";
import { NumberTicker } from "./number-ticker";

export interface KnowledgeStats {
  totalDocuments: number;
  totalTopics: number;
  totalEntities: number;
  publicDocuments: number;
  privateDocuments: number;
  totalFolders: number;
  recentDocuments: {
    id: string;
    fileName: string;
    createdAt: string;
    context: "public" | "private";
  }[];
  visibilityBreakdown: {
    internal: number;
    public: number;
    restricted: number;
  };
  clientAccess: Array<{
    clientCode: string;
    documentCount: number;
  }>;
  featureDistribution: Array<{
    feature: string;
    count: number;
  }>;
  useCaseDistribution: Array<{
    useCase: string;
    count: number;
  }>;
  riskSummary: {
    totalRisks: number;
    documentsWithRisks: number;
    topRisks: string[];
  };
  languageDistribution: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  color: "blue" | "purple" | "green" | "orange" | "pink" | "cyan";
  delay?: number;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    progress: "bg-blue-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    progress: "bg-purple-500",
  },
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    progress: "bg-emerald-500",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    badge: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    progress: "bg-orange-500",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    badge: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    progress: "bg-pink-500",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    progress: "bg-cyan-500",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
  delay = 0,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg transition-colors", colors.bg, `group-hover:${colors.bg.replace('/10', '/20')}`)}>
          <Icon className={cn("h-5 w-5", colors.text)} />
        </div>
        {description && (
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", colors.badge)}>
            {description}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-4xl font-bold tracking-tight">
          <NumberTicker value={value} delay={delay} />
        </p>
      </div>
    </motion.div>
  );
}

export function TotalDocumentsCard({ count, delay = 0 }: { count: number; delay?: number }) {
  return (
    <StatCard
      title="Total Documents"
      value={count}
      icon={FileText}
      description="Indexed"
      color="blue"
      delay={delay}
    />
  );
}

export function TotalTopicsCard({ count, delay = 0 }: { count: number; delay?: number }) {
  return (
    <StatCard
      title="Topics Discovered"
      value={count}
      icon={Sparkles}
      description="Unique"
      color="purple"
      delay={delay}
    />
  );
}

export function TotalEntitiesCard({ count, delay = 0 }: { count: number; delay?: number }) {
  return (
    <StatCard
      title="Entities Extracted"
      value={count}
      icon={Tag}
      description="Named"
      color="green"
      delay={delay}
    />
  );
}

export function VisibilityScopeCard({
  visibilityBreakdown,
  delay = 0,
}: {
  visibilityBreakdown: KnowledgeStats["visibilityBreakdown"];
  delay?: number;
}) {
  const { internal, public: publicCount, restricted } = visibilityBreakdown;
  const total = internal + publicCount + restricted;
  const internalPercent = total > 0 ? Math.round((internal / total) * 100) : 0;
  const publicPercent = total > 0 ? Math.round((publicCount / total) * 100) : 0;
  const restrictedPercent = total > 0 ? Math.round((restricted / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gradient-to-br from-amber-500/10 to-blue-500/10 rounded-lg">
          <Shield className="h-5 w-5 text-indigo-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          Visibility
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Document Visibility</p>
      
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Internal</span>
          </div>
          <span className="text-sm font-semibold">
            <NumberTicker value={internal} delay={delay} />
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-500" />
            <span className="text-sm">Public</span>
          </div>
          <span className="text-sm font-semibold">
            <NumberTicker value={publicCount} delay={delay + 0.1} />
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Restricted</span>
          </div>
          <span className="text-sm font-semibold">
            <NumberTicker value={restricted} delay={delay + 0.15} />
          </span>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
          <div className="h-full flex">
            {internalPercent > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${internalPercent}%` }}
                transition={{ duration: 0.5, delay: delay + 0.2 }}
                className="h-full bg-amber-500"
              />
            )}
            {publicPercent > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${publicPercent}%` }}
                transition={{ duration: 0.5, delay: delay + 0.25 }}
                className="h-full bg-green-500"
              />
            )}
            {restrictedPercent > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${restrictedPercent}%` }}
                transition={{ duration: 0.5, delay: delay + 0.3 }}
                className="h-full bg-blue-500"
              />
            )}
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{internalPercent}% Internal</span>
          <span>{publicPercent}% Public</span>
          <span>{restrictedPercent}% Restricted</span>
        </div>
      </div>
    </motion.div>
  );
}

export function ContextSplitCard({
  publicCount,
  privateCount,
  delay = 0,
}: {
  publicCount: number;
  privateCount: number;
  delay?: number;
}) {
  const total = publicCount + privateCount;
  const publicPercent = total > 0 ? Math.round((publicCount / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
          <Database className="h-5 w-5 text-indigo-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          Context
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Document Context</p>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Public</span>
          </div>
          <span className="text-sm font-semibold">
            <NumberTicker value={publicCount} delay={delay} />
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-500" />
            <span className="text-sm">Private</span>
          </div>
          <span className="text-sm font-semibold">
            <NumberTicker value={privateCount} delay={delay + 0.1} />
          </span>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${publicPercent}%` }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{publicPercent}% Public</span>
          <span>{100 - publicPercent}% Private</span>
        </div>
      </div>
    </motion.div>
  );
}

export function ClientAccessCard({
  clientAccess,
  delay = 0,
}: {
  clientAccess: KnowledgeStats["clientAccess"];
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Users className="h-5 w-5 text-blue-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
          Access
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Client Access</p>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {clientAccess.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No restricted documents
          </p>
        ) : (
          clientAccess.slice(0, 5).map((item, index) => (
            <motion.div
              key={item.clientCode}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + index * 0.05 }}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30"
            >
              <span className="text-sm truncate font-medium">{item.clientCode}</span>
              <span className="text-sm font-semibold text-blue-500">
                <NumberTicker value={item.documentCount} delay={delay + index * 0.05} />
              </span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export function FeatureUseCaseCard({
  featureDistribution,
  useCaseDistribution,
  delay = 0,
}: {
  featureDistribution: KnowledgeStats["featureDistribution"];
  useCaseDistribution: KnowledgeStats["useCaseDistribution"];
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Layers className="h-5 w-5 text-purple-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
          Features
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Top Features & Use Cases</p>
      
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Features</p>
          <div className="space-y-1.5">
            {featureDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground">No features tagged</p>
            ) : (
              featureDistribution.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + index * 0.05 }}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate">{item.feature}</span>
                  <span className="font-semibold">{item.count}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
        
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Use Cases</p>
          <div className="space-y-1.5">
            {useCaseDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground">No use cases tagged</p>
            ) : (
              useCaseDistribution.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.useCase}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + (index + 3) * 0.05 }}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate">{item.useCase}</span>
                  <span className="font-semibold">{item.count}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function RiskAnalysisCard({
  riskSummary,
  delay = 0,
}: {
  riskSummary: KnowledgeStats["riskSummary"];
  delay?: number;
}) {
  const { totalRisks, documentsWithRisks, topRisks } = riskSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
          Risks
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Risk Analysis</p>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Total Risks</span>
          <span className="text-lg font-bold text-orange-500">
            <NumberTicker value={totalRisks} delay={delay} />
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Docs with Risks</span>
          <span className="text-sm font-semibold">
            <NumberTicker value={documentsWithRisks} delay={delay + 0.1} />
          </span>
        </div>
        
        {topRisks.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Top Risks</p>
            <div className="space-y-1">
              {topRisks.slice(0, 3).map((risk, index) => (
                <motion.div
                  key={risk}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + (index + 2) * 0.05 }}
                  className="text-xs text-muted-foreground truncate"
                >
                  • {risk}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function LanguageDistributionCard({
  languageDistribution,
  delay = 0,
}: {
  languageDistribution: KnowledgeStats["languageDistribution"];
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full justify-center p-2 relative group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Languages className="h-5 w-5 text-cyan-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
          Languages
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Language Distribution</p>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {languageDistribution.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No language data
          </p>
        ) : (
          languageDistribution.slice(0, 5).map((item, index) => (
            <motion.div
              key={item.language}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + index * 0.05 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium uppercase">{item.language}</span>
                <span className="text-muted-foreground">{item.percentage}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.5, delay: delay + index * 0.05 + 0.1 }}
                  className="h-full bg-cyan-500 rounded-full"
                />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export function RecentActivityCard({
  documents,
  delay = 0,
}: {
  documents: KnowledgeStats["recentDocuments"];
  delay?: number;
}) {
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay }}
      className="flex flex-col h-full p-2"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Clock className="h-5 w-5 text-orange-500" />
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
          Recent
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground font-medium mb-3">Recent Activity</p>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No recent documents
          </p>
        ) : (
          documents.slice(0, 5).map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + index * 0.05 }}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  doc.context === "public" ? "bg-blue-500" : "bg-purple-500"
                )} />
                <span className="text-sm truncate">{doc.fileName}</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimeAgo(doc.createdAt)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export function FoldersCard({ count, delay = 0 }: { count: number; delay?: number }) {
  return (
    <StatCard
      title="Folders"
      value={count}
      icon={Folder}
      description="Organized"
      color="cyan"
      delay={delay}
    />
  );
}

// Combined stats overview component
export function KnowledgeStatsOverview({
  stats,
  className,
}: {
  stats: KnowledgeStats;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <TotalDocumentsCard count={stats.totalDocuments} delay={0} />
      <TotalTopicsCard count={stats.totalTopics} delay={0.1} />
      <TotalEntitiesCard count={stats.totalEntities} delay={0.2} />
      <FoldersCard count={stats.totalFolders} delay={0.3} />
    </div>
  );
}
