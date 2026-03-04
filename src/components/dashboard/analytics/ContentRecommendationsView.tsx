"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { ShineBorder } from "@/components/ui/shine-border";

interface Recommendation {
  id: string;
  team_id: string;
  document_name: string;
  topics: string[];
  summary: string;
  status: "pending" | "created" | "dismissed" | "analyzing";
  metadata_recommendations: {
    action?: string;
    suggestions?: string[];
    priority?: string;
    sample_queries?: string[];
    problem_reasons?: string[];
    cluster_stats?: {
      query_count?: number;
      avg_problem_score?: number;
      total_problem_score?: number;
    };
    source_search_ids?: string[];
    generated_at?: string;
    workflow?: string;
  };
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  pending: number;
  analyzing: number;
  created: number;
  dismissed: number;
}

interface Props {
  teamId: string;
}

export function ContentRecommendationsView({ teamId }: Props) {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, analyzing: 0, created: 0, dismissed: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchRecommendations();
  }, [teamId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/recommendations?teamId=${teamId}`);
      const data = await res.json();
      
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        setStats(data.stats || { total: 0, pending: 0, analyzing: 0, created: 0, dismissed: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdating(id);
      const res = await fetch("/api/analytics/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      
      if (res.ok) {
        // "ai_fix" is stored as "analyzing" in the DB
        const displayStatus = (newStatus === "ai_fix" ? "analyzing" : newStatus) as Recommendation["status"];
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: displayStatus } : r))
        );
        // Update stats
        fetchRecommendations();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-500/10 border-red-500/30";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      case "low":
        return "text-green-500 bg-green-500/10 border-green-500/30";
      default:
        return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "analyzing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "created":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "dismissed":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action?: string) => {
    const labels: Record<string, string> = {
      create_new: "Opprett nytt dokument",
      improve_existing: "Forbedre eksisterende",
      add_examples: "Legg til eksempler",
      add_faq: "Legg til FAQ",
    };
    return labels[action || ""] || "Anbefaling";
  };

  const filteredRecommendations = recommendations.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("all")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Totalt</p>
              </div>
              <Lightbulb className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("cursor-pointer hover:border-yellow-500/50 transition-colors", filter === "pending" && "border-yellow-500")} onClick={() => setFilter("pending")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Ventende</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("cursor-pointer hover:border-green-500/50 transition-colors", filter === "created" && "border-green-500")} onClick={() => setFilter("created")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.created}</p>
                <p className="text-xs text-muted-foreground">Implementert</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("cursor-pointer hover:border-muted-foreground/50 transition-colors", filter === "dismissed" && "border-muted-foreground")} onClick={() => setFilter("dismissed")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{stats.dismissed}</p>
                <p className="text-xs text-muted-foreground">Avvist</p>
              </div>
              <XCircle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No recommendations{filter !== "all" ? ` with status "${filter}"` : ""}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Recommendations are generated automatically based on search analysis
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecommendations.map((rec) => {
            const isExpanded = expandedId === rec.id;
            const meta = rec.metadata_recommendations || {};
            
            return (
              <Card
                key={rec.id}
                className={cn(
                  "transition-all duration-200",
                  rec.status === "dismissed" && "opacity-60",
                )}
              >
                <CardHeader
                  className="py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(rec.status)}
                        <CardTitle className="text-base font-medium truncate">
                          {rec.document_name}
                        </CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rec.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {meta.priority && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getPriorityColor(meta.priority),
                          )}
                        >
                          {meta.priority === "high"
                            ? "Høy"
                            : meta.priority === "medium"
                              ? "Medium"
                              : "Lav"}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4 space-y-4">
                    {/* Action type */}
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Handling:</span>
                      <span className="font-medium">
                        {getActionLabel(meta.action)}
                      </span>
                    </div>

                    {/* Topics */}
                    {rec.topics && rec.topics.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Relaterte emner:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rec.topics.map((topic, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {meta.suggestions && meta.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Forslag:
                        </p>
                        <ul className="text-sm space-y-1">
                          {meta.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sample queries */}
                    {meta.sample_queries && meta.sample_queries.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Eksempel-søk som trigget dette:
                        </p>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                          {meta.sample_queries.slice(0, 3).map((q, i) => (
                            <p
                              key={i}
                              className="text-sm text-muted-foreground italic"
                            >
                              "{q}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Problem stats */}
                    {meta.cluster_stats && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {meta.cluster_stats.query_count} searches
                        </span>
                        {meta.cluster_stats.avg_problem_score && (
                          <span>
                            Problem score:{" "}
                            {meta.cluster_stats.avg_problem_score}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {rec.status === "pending" && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.id, "created");
                          }}
                          disabled={updating === rec.id}
                        >
                          {updating === rec.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Mark as completed
                        </Button>
                            <Button
                              variant="outline"
                              onClick={() => updateStatus(rec.id, "ai_fix")}
                              disabled={updating === rec.id}
                            >
                              Fix with AI
                            </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.id, "dismissed");
                          }}
                          disabled={updating === rec.id}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                      </div>
                    )}

                    {rec.status === "dismissed" && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.id, "pending");
                          }}
                          disabled={updating === rec.id}
                        >
                          Restore
                        </Button>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(rec.created_at).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
