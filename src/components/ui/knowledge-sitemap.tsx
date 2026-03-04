"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Search,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  Tag,
  Globe,
  Lock,
  Filter,
  X,
  Sparkles,
  Users,
} from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface DocumentInfo {
  id: string;
  fileName: string;
  folderId?: string;
  folderPath?: string;
  visibilityScope?: "internal" | "public" | "restricted";
  topics: string[];
  entities: string[];
  createdAt: string;
}

export interface KnowledgeSitemapProps {
  documents: DocumentInfo[];
  onDocumentClick?: (document: DocumentInfo) => void;
  onTopicClick?: (topic: string) => void;
  className?: string;
}

interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: FolderNode[];
  documents: DocumentInfo[];
}

// Build folder tree from documents
function buildFolderTree(documents: DocumentInfo[]): FolderNode {
  const root: FolderNode = {
    id: "root",
    name: "Knowledge Base",
    path: "",
    children: [],
    documents: [],
  };

  const folderMap = new Map<string, FolderNode>();
  folderMap.set("", root);

  // Group documents by folder path
  for (const doc of documents) {
    const folderPath = doc.folderPath || doc.folderId || "";
    
    if (!folderPath) {
      root.documents.push(doc);
      continue;
    }

    // Create folder path segments
    const segments = folderPath.split("/").filter(Boolean);
    let currentPath = "";
    let parentNode = root;

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      
      if (!folderMap.has(currentPath)) {
        const newFolder: FolderNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          children: [],
          documents: [],
        };
        folderMap.set(currentPath, newFolder);
        parentNode.children.push(newFolder);
      }
      
      parentNode = folderMap.get(currentPath)!;
    }

    parentNode.documents.push(doc);
  }

  return root;
}

// Folder Item component
function FolderItem({
  folder,
  level,
  expanded,
  onToggle,
  onDocumentClick,
  onTopicClick,
  searchQuery,
}: {
  folder: FolderNode;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDocumentClick?: (doc: DocumentInfo) => void;
  onTopicClick?: (topic: string) => void;
  searchQuery: string;
}) {
  const isExpanded = expanded.has(folder.id);
  const hasContent = folder.children.length > 0 || folder.documents.length > 0;
  const totalDocs = folder.documents.length + 
    folder.children.reduce((sum, child) => sum + countDocuments(child), 0);

  function countDocuments(node: FolderNode): number {
    return node.documents.length + 
      node.children.reduce((sum, child) => sum + countDocuments(child), 0);
  }

  // Filter documents by search
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return folder.documents;
    const query = searchQuery.toLowerCase();
    return folder.documents.filter(doc =>
      doc.fileName.toLowerCase().includes(query) ||
      doc.topics.some(t => t.toLowerCase().includes(query)) ||
      doc.entities.some(e => e.toLowerCase().includes(query))
    );
  }, [folder.documents, searchQuery]);

  // Check if folder or any child matches search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (folder.name.toLowerCase().includes(query)) return true;
    if (filteredDocuments.length > 0) return true;
    return folder.children.some(child => {
      const childMatches = child.name.toLowerCase().includes(query);
      return childMatches || child.documents.some(d => 
        d.fileName.toLowerCase().includes(query) ||
        d.topics.some(t => t.toLowerCase().includes(query))
      );
    });
  }, [folder, searchQuery, filteredDocuments]);

  if (!matchesSearch && searchQuery) return null;

  return (
    <div className="select-none">
      {/* Folder header */}
      <motion.div
        className={cn(
          "flex items-center gap-2 py-2 px-3 cursor-pointer rounded-lg transition-colors",
          "hover:bg-muted/50",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: level > 0 ? level * 16 : undefined }}
        onClick={() => hasContent && onToggle(folder.id)}
        whileTap={{ scale: 0.98 }}
      >
        {/* Expand icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn("flex-shrink-0", !hasContent && "opacity-0")}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-primary" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Folder name */}
        <span className="font-medium text-sm flex-1 truncate">{folder.name}</span>

        {/* Document count badge */}
        {totalDocs > 0 && (
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {totalDocs}
          </span>
        )}
      </motion.div>

      {/* Children and documents */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Child folders */}
            {folder.children.map((child) => (
              <FolderItem
                key={child.id}
                folder={child}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                onDocumentClick={onDocumentClick}
                onTopicClick={onTopicClick}
                searchQuery={searchQuery}
              />
            ))}

            {/* Documents */}
            {filteredDocuments.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                level={level + 1}
                onClick={onDocumentClick}
                onTopicClick={onTopicClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Document Item component
function DocumentItem({
  document,
  level,
  onClick,
  onTopicClick,
}: {
  document: DocumentInfo;
  level: number;
  onClick?: (doc: DocumentInfo) => void;
  onTopicClick?: (topic: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      className={cn(
        "py-2 px-3 rounded-lg transition-colors",
        "hover:bg-muted/30 cursor-pointer"
      )}
      style={{ paddingLeft: (level + 1) * 16 + 8 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onClick?.(document)}
    >
      <div className="flex items-center gap-2">
        {/* File icon */}
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        
        {/* File name */}
        <span className="text-sm truncate flex-1">{document.fileName}</span>
        
        {/* Visibility scope badge */}
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
          document.visibilityScope === "public"
            ? "bg-green-100 dark:bg-green-900/30"
            : document.visibilityScope === "restricted"
            ? "bg-blue-100 dark:bg-blue-900/30"
            : "bg-amber-100 dark:bg-amber-900/30"
        )}>
          {document.visibilityScope === "public" ? (
            <Globe className="h-3 w-3 text-green-500" />
          ) : document.visibilityScope === "restricted" ? (
            <Users className="h-3 w-3 text-blue-500" />
          ) : (
            <Lock className="h-3 w-3 text-amber-500" />
          )}
        </div>

        {/* Expand topics button */}
        {document.topics.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
          >
            <Tag className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Topics detail */}
      <AnimatePresence>
        {showDetails && document.topics.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2 pl-6"
          >
            <div className="flex flex-wrap gap-1">
              {document.topics.slice(0, 6).map((topic, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTopicClick?.(topic);
                  }}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {topic}
                </button>
              ))}
              {document.topics.length > 6 && (
                <span className="text-xs text-muted-foreground py-0.5">
                  +{document.topics.length - 6} more
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Main Knowledge Sitemap Component
export function KnowledgeSitemap({
  documents,
  onDocumentClick,
  onTopicClick,
  className,
}: KnowledgeSitemapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "internal" | "public" | "restricted">("all");

  // Filter documents by visibility scope
  const filteredDocuments = useMemo(() => {
    if (visibilityFilter === "all") return documents;
    return documents.filter((d) => d.visibilityScope === visibilityFilter);
  }, [documents, visibilityFilter]);

  // Build folder tree
  const folderTree = useMemo(() => {
    return buildFolderTree(filteredDocuments);
  }, [filteredDocuments]);

  // Toggle folder expansion
  const toggleFolder = useCallback((id: string) => {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Expand all folders
  const expandAll = useCallback(() => {
    const getAllIds = (node: FolderNode): string[] => {
      return [node.id, ...node.children.flatMap(getAllIds)];
    };
    setExpanded(new Set(getAllIds(folderTree)));
  }, [folderTree]);

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setExpanded(new Set(["root"]));
  }, []);

  // Stats
  const stats = useMemo(() => {
    const uniqueTopics = new Set<string>();
    filteredDocuments.forEach(d => d.topics.forEach(t => uniqueTopics.add(t)));
    return {
      documents: filteredDocuments.length,
      topics: uniqueTopics.size,
    };
  }, [filteredDocuments]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with search and filters */}
      <div className="flex flex-col gap-3 p-4 border-b border-border/40">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files, topics, entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {visibilityFilter === "all" ? "All" : visibilityFilter.charAt(0).toUpperCase() + visibilityFilter.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setVisibilityFilter("all")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibilityFilter("internal")}>
                  <Lock className="h-4 w-4 mr-2 text-amber-500" />
                  Internal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibilityFilter("public")}>
                  <Globe className="h-4 w-4 mr-2 text-green-500" />
                  Public
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibilityFilter("restricted")}>
                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                  Restricted
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="text-xs text-muted-foreground">
              {stats.documents} docs • {stats.topics} topics
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
              Expand
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
              Collapse
            </Button>
          </div>
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredDocuments.length > 0 ? (
          <FolderItem
            folder={folderTree}
            level={0}
            expanded={expanded}
            onToggle={toggleFolder}
            onDocumentClick={onDocumentClick}
            onTopicClick={onTopicClick}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No documents indexed</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Upload files or add URLs to build your knowledge base
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
