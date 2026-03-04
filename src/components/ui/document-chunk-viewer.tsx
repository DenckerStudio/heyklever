"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  X,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  BookOpen,
  Hash,
  FolderOpen,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import type { TopicData, ChunkData } from "./knowledge-visualization";

interface DocumentChunkViewerProps {
  topic: TopicData | null;
  teamId: string;
  onClose: () => void;
  className?: string;
}

interface ExpandedChunk extends ChunkData {
  isExpanded?: boolean;
}

// Group chunks by document
interface DocumentGroup {
  fileName: string;
  chunks: ChunkData[];
  isExpanded: boolean;
}

// Chunk card component with enhanced animations
function ChunkCard({
  chunk,
  index,
  searchQuery,
  isExpanded,
  onToggleExpand,
  showFileName = true,
}: {
  chunk: ChunkData;
  index: number;
  searchQuery: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showFileName?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // Highlight search terms in content
  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim()) return chunk.content;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return chunk.content.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>'
    );
  }, [chunk.content, searchQuery]);

  // Get preview (first 200 chars)
  const preview = useMemo(() => {
    const text = chunk.content;
    if (text.length <= 200) return text;
    return text.substring(0, 200) + "...";
  }, [chunk.content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.04,
        ease: [0.4, 0, 0.2, 1]
      }}
      layout
      className={cn(
        "rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm",
        "hover:border-border/60 hover:bg-card/70 transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/5",
        isExpanded && "ring-2 ring-primary/20 bg-card/70"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <motion.div 
            className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-semibold"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {index + 1}
          </motion.div>
          {showFileName && chunk.fileName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{chunk.fileName}</span>
            </div>
          )}
          {chunk.relevance && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.04 + 0.2, type: "spring", stiffness: 500 }}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                chunk.relevance > 0.8
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : chunk.relevance > 0.5
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
              )}
            >
              {Math.round(chunk.relevance * 100)}% match
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={handleCopy}
          >
            <motion.div
              key={copied ? "check" : "copy"}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </motion.div>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={onToggleExpand}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </Button>
        </div>
      </div>

      {/* Summary */}
      {chunk.chunk_summary && (
        <motion.div 
          className="px-3 py-2 bg-muted/30 border-b border-border/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.04 + 0.1 }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Sparkles className="h-3 w-3" />
            <span className="font-medium">Summary</span>
          </div>
          <p className="text-sm text-foreground/90">{chunk.chunk_summary}</p>
        </motion.div>
      )}

      {/* Content */}
      <div className="p-3">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed overflow-hidden"
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
            />
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-foreground/80 line-clamp-3"
              dangerouslySetInnerHTML={{
                __html: searchQuery
                  ? preview.replace(
                      new RegExp(
                        `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                        "gi"
                      ),
                      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>'
                    )
                  : preview,
              }}
            />
          )}
        </AnimatePresence>

        {!isExpanded && chunk.content.length > 200 && (
          <motion.button
            onClick={onToggleExpand}
            className="text-xs text-primary hover:text-primary/80 mt-2 font-medium"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            Show more →
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// Document group component for grouping chunks by file
function DocumentGroupCard({
  group,
  groupIndex,
  searchQuery,
  expandedChunks,
  onToggleGroup,
  onToggleChunk,
}: {
  group: DocumentGroup;
  groupIndex: number;
  searchQuery: string;
  expandedChunks: Set<string>;
  onToggleGroup: () => void;
  onToggleChunk: (chunkId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4, 
        delay: groupIndex * 0.08,
        ease: [0.4, 0, 0.2, 1]
      }}
      layout
      className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden"
    >
      {/* Document header */}
      <motion.button
        onClick={onToggleGroup}
        className={cn(
          "w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors",
          group.isExpanded && "bg-muted/20"
        )}
        whileHover={{ backgroundColor: "rgba(var(--muted), 0.3)" }}
      >
        <motion.div
          animate={{ rotate: group.isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm truncate">{group.fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {group.chunks.length} chunk{group.chunks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.button>

      {/* Chunks */}
      <AnimatePresence>
        {group.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2 border-t border-border/30">
              {group.chunks.map((chunk, index) => (
                <ChunkCard
                  key={chunk.id}
                  chunk={chunk}
                  index={index}
                  searchQuery={searchQuery}
                  isExpanded={expandedChunks.has(chunk.id)}
                  onToggleExpand={() => onToggleChunk(chunk.id)}
                  showFileName={false}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Backdrop overlay component
function ChunkViewerBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
      onClick={onClick}
    />
  );
}

// Main component
export function DocumentChunkViewer({
  topic,
  teamId,
  onClose,
  className,
}: DocumentChunkViewerProps) {
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Fetch chunks when topic changes
  useEffect(() => {
    if (!topic) {
      setChunks([]);
      return;
    }

    const fetchChunks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analytics/chunks?teamId=${encodeURIComponent(teamId)}&topic=${encodeURIComponent(topic.topic)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch chunks");
        }

        const data = await response.json();
        setChunks(data.chunks || []);
        
        // Auto-expand first group
        const firstFileName = data.chunks?.[0]?.fileName;
        if (firstFileName) {
          setExpandedGroups(new Set([firstFileName]));
        }
      } catch (err) {
        console.error("Error fetching chunks:", err);
        setError("Failed to load document chunks");
        setChunks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChunks();
  }, [topic, teamId]);

  // Filter chunks by search query
  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks;

    const query = searchQuery.toLowerCase();
    return chunks.filter(
      (chunk) =>
        chunk.content.toLowerCase().includes(query) ||
        chunk.chunk_summary?.toLowerCase().includes(query) ||
        chunk.fileName?.toLowerCase().includes(query)
    );
  }, [chunks, searchQuery]);

  // Group chunks by document
  const documentGroups = useMemo(() => {
    const groups = new Map<string, ChunkData[]>();
    
    filteredChunks.forEach((chunk) => {
      const fileName = chunk.fileName || "Unknown";
      if (!groups.has(fileName)) {
        groups.set(fileName, []);
      }
      groups.get(fileName)!.push(chunk);
    });

    return Array.from(groups.entries()).map(([fileName, chunks]) => ({
      fileName,
      chunks,
      isExpanded: expandedGroups.has(fileName),
    }));
  }, [filteredChunks, expandedGroups]);

  // Toggle chunk expansion
  const toggleChunkExpand = useCallback((chunkId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  }, []);

  // Toggle group expansion
  const toggleGroupExpand = useCallback((fileName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedChunks(new Set(filteredChunks.map((c) => c.id)));
    setExpandedGroups(new Set(documentGroups.map((g) => g.fileName)));
  }, [filteredChunks, documentGroups]);

  const collapseAll = useCallback(() => {
    setExpandedChunks(new Set());
    setExpandedGroups(new Set());
  }, []);

  if (!topic) return null;

  return (
    <>
      {/* Backdrop */}
      <ChunkViewerBackdrop onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, x: "100%" }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: "100%" }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          mass: 0.8
        }}
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[420px]",
          "bg-background/98 backdrop-blur-2xl border-l border-border/50",
          "shadow-2xl shadow-black/20 z-50 flex flex-col",
          className
        )}
      >
        {/* Decorative gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-48 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-muted/30 to-transparent" />
        </div>

        {/* Header */}
        <motion.div 
          className="relative flex-shrink-0 p-4 border-b border-border/40"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br shadow-lg",
                  topic.context === "public"
                    ? "from-blue-500 to-cyan-500 shadow-blue-500/25"
                    : "from-purple-500 to-violet-500 shadow-purple-500/25"
                )}
              >
                <BookOpen className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h2 className="font-bold text-lg text-foreground">{topic.topic}</h2>
                <p className="text-xs text-muted-foreground">
                  {chunks.length} chunk{chunks.length !== 1 ? "s" : ""} from{" "}
                  {documentGroups.length} document{documentGroups.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in chunks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/30 border-border/40 focus:ring-2 focus:ring-primary/20"
            />
          </motion.div>

          {/* Actions */}
          <motion.div 
            className="flex items-center justify-between mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>
                  {filteredChunks.length} of {chunks.length}
                </span>
              </div>
              {/* View mode toggle */}
              <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
                <Button
                  variant={viewMode === "grouped" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setViewMode("grouped")}
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Grouped
                </Button>
                <Button
                  variant={viewMode === "flat" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setViewMode("flat")}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Flat
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs hover:bg-primary/10"
                onClick={expandAll}
              >
                Expand
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs hover:bg-primary/10"
                onClick={collapseAll}
              >
                Collapse
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <motion.div 
              className="flex items-center justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-10 w-10 text-primary mx-auto mb-3" />
                </motion.div>
                <p className="text-sm text-muted-foreground">Loading chunks...</p>
              </div>
            </motion.div>
          )}

          {error && !isLoading && (
            <motion.div 
              className="flex items-center justify-center py-12"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-center">
                <motion.div 
                  className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                >
                  <X className="h-7 w-7 text-destructive" />
                </motion.div>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </Button>
              </div>
            </motion.div>
          )}

          {!isLoading && !error && filteredChunks.length === 0 && (
            <motion.div 
              className="flex items-center justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No chunks match your search" : "No chunks available"}
                </p>
              </div>
            </motion.div>
          )}

          {/* Grouped view */}
          {viewMode === "grouped" && !isLoading && !error && (
            <AnimatePresence mode="popLayout">
              {documentGroups.map((group, index) => (
                <DocumentGroupCard
                  key={group.fileName}
                  group={group}
                  groupIndex={index}
                  searchQuery={searchQuery}
                  expandedChunks={expandedChunks}
                  onToggleGroup={() => toggleGroupExpand(group.fileName)}
                  onToggleChunk={toggleChunkExpand}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Flat view */}
          {viewMode === "flat" && !isLoading && !error && (
            <AnimatePresence mode="popLayout">
              {filteredChunks.map((chunk, index) => (
                <ChunkCard
                  key={chunk.id}
                  chunk={chunk}
                  index={index}
                  searchQuery={searchQuery}
                  isExpanded={expandedChunks.has(chunk.id)}
                  onToggleExpand={() => toggleChunkExpand(chunk.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer with stats */}
        <motion.div 
          className="relative flex-shrink-0 p-4 border-t border-border/40 bg-muted/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {topic.documents.length} source{topic.documents.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {chunks.reduce((acc, c) => acc + c.content.length, 0).toLocaleString()} chars
              </span>
            </div>
            {topic.folder && (
              <span className="truncate max-w-[150px] flex items-center gap-1" title={topic.folder}>
                <FolderOpen className="h-3 w-3" />
                {topic.folder.split("/").pop()}
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

export default DocumentChunkViewer;
