"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FileText,
  Folder,
  Search,
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  File,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface TeamFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  metadata?: {
    visibility_scope?: string;
    allowed_client_codes?: string[];
  };
}

interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "file";
  path: string;
  children?: FolderItem[];
}

interface FileAccessSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
}

export function FileAccessSelector({
  open,
  onOpenChange,
  selectedFileIds,
  onSelectionChange,
}: FileAccessSelectorProps) {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(selectedFileIds));

  // Sync local selection with prop
  useEffect(() => {
    setLocalSelection(new Set(selectedFileIds));
  }, [selectedFileIds]);

  // Fetch files when dialog opens
  useEffect(() => {
    if (open) {
      fetchFiles(currentPath);
    }
  }, [open, currentPath]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/files?path=${encodeURIComponent(path)}&metadata=true`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch("/api/teams/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 50 }),
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.files || []);
      }
    } catch (error) {
      console.error("Error searching files:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchFiles(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFiles]);

  const toggleFileSelection = (fileId: string) => {
    setLocalSelection((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleFolderExpand = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
        // Fetch folder contents
        fetchFolderContents(folderPath);
      }
      return next;
    });
  };

  const fetchFolderContents = async (folderPath: string) => {
    // This will be handled by the recursive rendering
    // The API call is made when we expand a folder
    try {
      const response = await fetch(`/api/teams/files?path=${encodeURIComponent(folderPath)}&metadata=true`);
      if (response.ok) {
        const data = await response.json();
        // Update the folder's children
        setFolders((prev) => {
          return prev.map((folder) => {
            if (folder.path === folderPath) {
              return {
                ...folder,
                children: [
                  ...(data.folders || []).map((f: FolderItem) => ({ ...f, type: "folder" as const })),
                  ...(data.files || []).map((f: TeamFile) => ({ ...f, type: "file" as const })),
                ],
              };
            }
            return folder;
          });
        });
      }
    } catch (error) {
      console.error("Error fetching folder contents:", error);
    }
  };

  const handleSave = () => {
    onSelectionChange(Array.from(localSelection));
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSelection(new Set(selectedFileIds));
    onOpenChange(false);
  };

  const clearSelection = () => {
    setLocalSelection(new Set());
  };

  const getFileIcon = (file: TeamFile) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext || "")) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    if (["doc", "docx"].includes(ext || "")) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (["xls", "xlsx"].includes(ext || "")) {
      return <FileText className="w-4 h-4 text-green-500" />;
    }
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <File className="w-4 h-4 text-purple-500" />;
    }
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const renderFileItem = (file: TeamFile) => {
    const isSelected = localSelection.has(file.id);

    return (
      <motion.div
        key={file.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted/50 border border-transparent"
        )}
        onClick={() => toggleFileSelection(file.id)}
      >
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </div>
        {getFileIcon(file)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground truncate">{file.path}</p>
        </div>
        {file.metadata?.visibility_scope && (
          <Badge variant="outline" className="text-xs shrink-0">
            {file.metadata.visibility_scope}
          </Badge>
        )}
      </motion.div>
    );
  };

  const renderFolderItem = (folder: FolderItem, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.path);

    return (
      <div key={folder.id} style={{ marginLeft: depth * 16 }}>
        <div
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleFolderExpand(folder.path)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <Folder className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">{folder.name}</span>
        </div>
        <AnimatePresence>
          {isExpanded && folder.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {folder.children.map((child) =>
                child.type === "folder"
                  ? renderFolderItem(child as FolderItem, depth + 1)
                  : renderFileItem(child as unknown as TeamFile)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Select Files
          </DialogTitle>
          <DialogDescription>
            Choose which files this client URL can access. Selected files will be available in the chat.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Selection count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {localSelection.size} selected
            </Badge>
            {localSelection.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchFiles(currentPath)}
            className="gap-1"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto border rounded-lg p-2 space-y-1 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchQuery ? (
            // Search results
            searchResults.length > 0 ? (
              searchResults.map(renderFileItem)
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No files found matching &quot;{searchQuery}&quot;
              </div>
            )
          ) : (
            // File tree
            <>
              {folders.map((folder) => renderFolderItem(folder))}
              {files.map(renderFileItem)}
              {folders.length === 0 && files.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No files found in this folder
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Selection ({localSelection.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
