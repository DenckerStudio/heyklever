"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonitoredUrl {
  id: string;
  url: string;
  checkFrequency: "daily" | "weekly";
  lastCheckedAt: string | null;
  lastContentHash: string | null;
  isActive: boolean;
  createdAt: string;
  hasChanges?: boolean;
}

interface URLMonitorPanelProps {
  teamId: string;
  onSuccess?: () => void;
}

export function URLMonitorPanel({ teamId, onSuccess }: URLMonitorPanelProps) {
  const [urls, setUrls] = useState<MonitoredUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add URL form state
  const [newUrl, setNewUrl] = useState("");
  const [newFrequency, setNewFrequency] = useState<"daily" | "weekly">("daily");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Fetch monitored URLs
  const fetchUrls = useCallback(async () => {
    try {
      const response = await fetch(`/api/monitored-urls?teamId=${teamId}`);
      if (!response.ok) throw new Error("Failed to fetch URLs");
      const data = await response.json();
      setUrls(data.urls || []);
      setError(null);
    } catch (err) {
      setError("Failed to load monitored URLs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  // Add new URL
  const handleAddUrl = async () => {
    if (!newUrl.trim()) return;

    // Validate URL
    try {
      new URL(newUrl.trim());
    } catch {
      setAddError("Please enter a valid URL");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const response = await fetch("/api/monitored-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          url: newUrl.trim(),
          checkFrequency: newFrequency,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add URL");
      }

      const data = await response.json();
      setUrls((prev) => [data.url, ...prev]);
      setNewUrl("");
      setNewFrequency("daily");
      onSuccess?.();
    } catch (err: any) {
      setAddError(err.message || "Failed to add URL");
    } finally {
      setIsAdding(false);
    }
  };

  // Remove URL
  const handleRemoveUrl = async (urlId: string) => {
    try {
      const response = await fetch(`/api/monitored-urls?id=${urlId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove URL");

      setUrls((prev) => prev.filter((u) => u.id !== urlId));
    } catch (err) {
      console.error("Failed to remove URL:", err);
    }
  };

  // Toggle URL active state
  const handleToggleActive = async (urlId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/monitored-urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: urlId,
          isActive: !isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update URL");

      setUrls((prev) =>
        prev.map((u) => (u.id === urlId ? { ...u, isActive: !isActive } : u))
      );
    } catch (err) {
      console.error("Failed to toggle URL:", err);
    }
  };

  // Manual refresh
  const handleManualCheck = async (urlId: string) => {
    try {
      const response = await fetch("/api/monitored-urls/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlId }),
      });

      if (!response.ok) throw new Error("Failed to check URL");

      // Refetch to get updated status
      fetchUrls();
    } catch (err) {
      console.error("Failed to check URL:", err);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add URL Form */}
      <div className="bg-card rounded-xl p-4 border border-border/40 space-y-4">
        <div>
          <h4 className="font-medium text-foreground mb-1">Add URL to Monitor</h4>
          <p className="text-xs text-muted-foreground">
            We&apos;ll automatically check for changes and sync updates to your AI
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="https://example.com/docs/getting-started"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setAddError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              className="w-full"
            />
          </div>
          <div className="w-full sm:w-36">
            <Select
              value={newFrequency}
              onValueChange={(v) => setNewFrequency(v as "daily" | "weekly")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddUrl} disabled={isAdding || !newUrl.trim()} className="gap-2">
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>

        {addError && <p className="text-sm text-red-500">{addError}</p>}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* URL List */}
      {urls.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">No URLs monitored yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Add URLs to your documentation or product pages, and we&apos;ll automatically sync
            changes to your AI&apos;s knowledge base.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              Monitored URLs ({urls.length})
            </h4>
            <Button variant="ghost" size="sm" onClick={fetchUrls} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {urls.map((url) => (
                <motion.div
                  key={url.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    url.isActive
                      ? "bg-card border-border/40"
                      : "bg-muted/30 border-border/20 opacity-60"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "p-2 rounded-lg shrink-0",
                          url.hasChanges
                            ? "bg-amber-500/10"
                            : url.isActive
                            ? "bg-emerald-500/10"
                            : "bg-muted"
                        )}
                      >
                        <Globe
                          className={cn(
                            "h-4 w-4",
                            url.hasChanges
                              ? "text-amber-500"
                              : url.isActive
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-foreground hover:text-primary truncate"
                          >
                            {url.url}
                          </a>
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {url.checkFrequency === "daily" ? "Daily" : "Weekly"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(url.lastCheckedAt)}
                          </span>
                          {url.hasChanges && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <AlertCircle className="h-3 w-3" />
                              Changes detected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleManualCheck(url.id)}
                        title="Check now"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(url.id, url.isActive)}
                        title={url.isActive ? "Pause monitoring" : "Resume monitoring"}
                      >
                        {url.isActive ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleRemoveUrl(url.id)}
                        title="Remove URL"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Automatic Sync</p>
            <p className="text-muted-foreground">
              When we detect changes to your monitored URLs, we automatically update your AI&apos;s
              knowledge base. No action required from you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
