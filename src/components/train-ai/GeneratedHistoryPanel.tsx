"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn, normalizeFileName } from "@/lib/utils";
import {
  Loader2,
  FileText,
  BookOpen,
  ListOrdered,
  Newspaper,
  FileIcon,
  Trash2,
  Eye,
  Copy,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  ChevronDown,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/animated-modal";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaveToStorageModal, type SaveOptions } from "./SaveToStorageModal";

interface GeneratedOutput {
  id: string;
  title: string;
  output_type: string;
  custom_output_type?: string;
  content: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  questionnaire_answers?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  ingested_at?: string;
}

interface GeneratedHistoryPanelProps {
  teamId: string;
}

const outputTypeIcons: Record<string, React.ReactNode> = {
  "user-manual": <BookOpen className="h-4 w-4" />,
  "documentation": <FileText className="h-4 w-4" />,
  "step-by-step": <ListOrdered className="h-4 w-4" />,
  "blog-post": <Newspaper className="h-4 w-4" />,
  "custom": <FileIcon className="h-4 w-4" />,
};

const outputTypeLabels: Record<string, string> = {
  "user-manual": "User Manual",
  "documentation": "Documentation",
  "step-by-step": "Step-by-Step Guide",
  "blog-post": "Blog Post",
  "custom": "Custom",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: "Draft",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  },
  pending_review: {
    label: "Pending Review",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  archived: {
    label: "Archived",
    icon: <Archive className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  },
};

export function GeneratedHistoryPanel({ teamId }: GeneratedHistoryPanelProps) {
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<GeneratedOutput | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [outputToDelete, setOutputToDelete] = useState<GeneratedOutput | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [outputToApprove, setOutputToApprove] = useState<GeneratedOutput | null>(null);

  const fetchOutputs = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const offset = reset ? 0 : outputs.length;
      const params = new URLSearchParams({
        teamId,
        limit: "20",
        offset: offset.toString(),
      });
      if (statusFilter) {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/train-ai/history?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      
      if (reset) {
        setOutputs(data.outputs || []);
      } else {
        setOutputs(prev => [...prev, ...(data.outputs || [])]);
      }
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [teamId, statusFilter, outputs.length]);

  useEffect(() => {
    fetchOutputs(true);
  }, [teamId, statusFilter]);

  const handleDelete = async () => {
    if (!outputToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/train-ai/history?id=${outputToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete output");
      }

      setOutputs(prev => prev.filter(o => o.id !== outputToDelete.id));
      setTotal(prev => prev - 1);
      setDeleteDialogOpen(false);
      setOutputToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = (output: GeneratedOutput) => {
    const blob = new Blob([output.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${output.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openApproveModal = (output: GeneratedOutput) => {
    setOutputToApprove(output);
    setApproveModalOpen(true);
  };

  const handleApproveWithOptions = async (saveOptions: SaveOptions) => {
    if (!outputToApprove) return;
    const output = outputToApprove;
    setApprovingId(output.id);
    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = normalizeFileName(`${output.output_type}-${timestamp}.md`);

      const uploadStartRes = await fetch("/api/storage/upload/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          fileSize: new Blob([output.content]).size,
          contentType: "text/markdown",
          scope: saveOptions.scope,
          path: saveOptions.folderPath,
        }),
      });

      if (!uploadStartRes.ok) {
        const errData = await uploadStartRes.json();
        throw new Error(errData.error || "Failed to get upload URL");
      }

      const { uploadUrl, token, path: objectPath, bucketId } = await uploadStartRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "text/markdown",
          Authorization: `Bearer ${token}`,
        },
        body: output.content,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const ingestRes = await fetch("/api/storage/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucketId,
          objectPath,
          fileName,
          content: output.content,
          visibilityScope: saveOptions.visibilityScope,
          allowedClientCodes: saveOptions.allowedClientCodes,
        }),
      });

      if (!ingestRes.ok) {
        console.error("Ingest webhook failed but file was uploaded");
      }

      const patchRes = await fetch("/api/train-ai/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: output.id,
          status: "approved",
          ingested_at: new Date().toISOString(),
        }),
      });

      if (!patchRes.ok) {
        throw new Error("Failed to update status");
      }

      const now = new Date().toISOString();
      setOutputs(prev =>
        prev.map(o =>
          o.id === output.id ? { ...o, status: "approved" as const, ingested_at: now } : o
        )
      );
      if (selectedOutput?.id === output.id) {
        setSelectedOutput(prev => (prev ? { ...prev, status: "approved" as const, ingested_at: now } : null));
      }
      setApproveModalOpen(false);
      setOutputToApprove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
      throw err;
    } finally {
      setApprovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchOutputs(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} generated document{total !== 1 ? "s" : ""}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {statusFilter ? statusConfig[statusFilter]?.label : "All Status"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              All Status
            </DropdownMenuItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                <span className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {outputs.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-border/40">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No generated documents yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Documents you create will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {outputs.map((output, index) => (
                <motion.div
                  key={output.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-card rounded-xl border border-border/40 p-4 hover:border-border/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        {outputTypeIcons[output.output_type] || <FileIcon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground truncate">
                          {output.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {outputTypeLabels[output.output_type] || output.custom_output_type || "Document"}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(output.created_at)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs gap-1",
                              statusConfig[output.status]?.className
                            )}
                          >
                            {statusConfig[output.status]?.icon}
                            {statusConfig[output.status]?.label}
                          </Badge>
                          {output.ingested_at && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              In RAG
                            </Badge>
                          )}
                        </div>
                        {output.content && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {output.content.substring(0, 200)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {output.status !== "approved" && !output.ingested_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          onClick={() => openApproveModal(output)}
                          disabled={approvingId === output.id}
                          title="Approve and send to knowledge base"
                        >
                          {approvingId === output.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedOutput(output)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(output.content)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(output)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setOutputToDelete(output);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOutputs(false)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* View Modal */}
      <Modal
        open={!!selectedOutput}
        setOpen={(open) => !open && setSelectedOutput(null)}
      >
        <ModalBody className="max-w-3xl md:max-w-6xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
          <ModalContent className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 pr-8">
              {selectedOutput && outputTypeIcons[selectedOutput.output_type]}
              <h2 className="text-lg font-semibold text-foreground truncate">
                {selectedOutput?.title}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground [&_a]:text-primary [&_a]:underline">
                {selectedOutput?.content && (
                  <MarkdownContent content={selectedOutput.content} />
                )}
              </div>
            </div>
          </ModalContent>
          <ModalFooter className="border-t border-border pt-4">
            {selectedOutput && selectedOutput.status !== "approved" && !selectedOutput.ingested_at && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => selectedOutput && openApproveModal(selectedOutput)}
                disabled={approvingId === selectedOutput.id}
              >
                {approvingId === selectedOutput.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Approve &amp; send to knowledge base
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedOutput && handleCopy(selectedOutput.content)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedOutput && handleDownload(selectedOutput)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </ModalFooter>
        </ModalBody>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generated Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{outputToDelete?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve – same Save to Storage modal as content training */}
      <SaveToStorageModal
        open={approveModalOpen}
        onOpenChange={(open) => {
          setApproveModalOpen(open);
          if (!open) setOutputToApprove(null);
        }}
        onSave={handleApproveWithOptions}
        saving={approvingId !== null}
        submitLabel="Approve & save to knowledge base"
      />
    </div>
  );
}
