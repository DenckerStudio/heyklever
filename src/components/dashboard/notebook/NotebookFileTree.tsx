"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  ChevronDown, 
  Folder as FolderIcon, 
  Loader2, 
  Grid3x3,
  List
} from "lucide-react";
import type { DriveItem } from "@/components/drive/types";
import { FileTypeIcon } from "./FileIcons";
import { NotebookFolderView } from "./NotebookFolderView";

interface NotebookFileTreeProps {
  onFileSelect: (file: DriveItem | null) => void;
  selectedFileId?: string;
}

interface SupabaseStorageFile {
  id?: string;
  name: string;
  metadata?: {
    mimetype?: string;
    size?: number;
    path?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export function NotebookFileTree({ onFileSelect, selectedFileId }: NotebookFileTreeProps) {
  const [scope] = useState<"public" | "private">("private");
  const [viewMode, setViewMode] = useState<"folder" | "tree">("folder");

  return (
    <div className="h-full flex flex-col bg-transparent relative">

      <div className="p-4">
        {/* File Browser Section */}
        <div className="flex items-center justify-between mb-3 mt-12">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1">
            Focus on a file
          </p>
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("folder")}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "folder" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Folder View"
            >
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "tree" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tree View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === "folder" ? (
          <NotebookFolderView 
            scope={scope}
            onFileSelect={onFileSelect}
            selectedFileId={selectedFileId}
          />
        ) : (
          <div className="h-full overflow-y-auto px-3 pb-4 scrollbar-thin">
            <FileTreeRoot 
              scope={scope} 
              onFileSelect={onFileSelect}
              selectedFileId={selectedFileId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FileTreeRoot({ 
  scope, 
  onFileSelect,
  selectedFileId 
}: { 
  scope: "public" | "private";
  onFileSelect: (file: DriveItem | null) => void;
  selectedFileId?: string;
}) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add refresh key state
  const [refreshKey, setRefreshKey] = useState(0);

  // Expose refresh capability if needed via ref or context in future
  
  const fetchRoot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/storage/list?scope=${scope}&path=`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files`);
      }

      const data = await response.json();
      const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata ? 'file' : 'folder',
        size: file.metadata?.size ? String(file.metadata.size) : undefined,
        modifiedAt: file.updated_at ? new Date(file.updated_at).toLocaleDateString() : undefined,
        provider: 'supabase_storage',
        path: file.name,
        created_at: file.created_at,
        updated_at: file.updated_at,
        mimeType: file.metadata?.mimetype
      }));
      
      // Filter out system folders/files
      const filteredItems = storageItems.filter(i => {
        const name = i.name.toLowerCase();
        return name !== "private" && name !== "public" && name !== ".keep" && name !== scope;
      });

      setItems(filteredItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [scope, refreshKey]);

  useEffect(() => {
    fetchRoot();
    // Refresh every 10s or on focus could be added here
  }, [fetchRoot]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400/70 p-4 text-center bg-red-500/5 rounded-lg border border-red-500/10">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/60 p-8 text-center">
        No files found
      </div>
    );
  }

  // Sort: Folders first, then files
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });

  return (
    <div className="space-y-0.5">
      {sortedItems.map(item => (
        <TreeItem 
          key={item.id} 
          item={item} 
          scope={scope}
          level={0}
          onFileSelect={onFileSelect}
          selectedFileId={selectedFileId}
          parentPath=""
        />
      ))}
    </div>
  );
}

function TreeItem({ 
  item, 
  scope, 
  level, 
  onFileSelect,
  selectedFileId,
  parentPath
}: { 
  item: DriveItem; 
  scope: "public" | "private";
  level: number;
  onFileSelect: (file: DriveItem | null) => void;
  selectedFileId?: string;
  parentPath: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type !== 'folder') {
      onFileSelect(item);
      return;
    }

    setExpanded(!expanded);

    if (!expanded && !hasLoaded) {
      try {
        setLoading(true);
        const response = await fetch(`/api/storage/list?scope=${scope}&path=${encodeURIComponent(fullPath)}`);
        const data = await response.json();
        
        const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
          id: file.id || file.name,
          name: file.name,
          type: file.metadata ? 'file' : 'folder',
          size: file.metadata?.size ? String(file.metadata.size) : undefined,
          provider: 'supabase_storage',
          path: file.name, // This comes as relative name from API often, need to check
          updated_at: file.updated_at,
          mimeType: file.metadata?.mimetype
        }));

        // API usually returns names relative to the listed folder, but let's ensure
        setChildren(storageItems.filter(i => i.name !== ".keep"));
        setHasLoaded(true);
      } catch (err) {
        console.error("Failed to load folder contents", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const isSelected = item.id === selectedFileId;

  return (
    <div>
      <div 
        className={cn(
          "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] transition-all duration-200 select-none",
          isSelected 
            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
            : "hover:bg-muted/40 text-foreground/80 hover:text-foreground border border-transparent hover:border-border/20",
          loading && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 16 + 10}px` }}
        onClick={handleToggle}
      >
        {/* Expand/Collapse Icon */}
        {item.type === 'folder' && (
          <span className="shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
        
        {/* File/Folder Icon */}
        {item.type === 'folder' ? (
          <FolderIcon className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            expanded ? "text-blue-400/80" : "text-blue-500/70"
          )} />
        ) : (
          <FileTypeIcon 
            fileName={item.name} 
            mimeType={item.mimeType}
            className="w-4 h-4 shrink-0"
          />
        )}
        
        <span className="truncate flex-1 font-medium">{item.name}</span>
        
        {loading && <Loader2 className="w-3 h-3 animate-spin ml-auto text-muted-foreground/50" />}
      </div>

      {expanded && item.type === 'folder' && (
        <div className="mt-0.5">
          {children.length === 0 && !loading ? (
            <div 
              className="text-[11px] text-muted-foreground/50 py-1.5 pl-8 italic"
              style={{ paddingLeft: `${(level + 1) * 16 + 32}px` }}
            >
              Empty folder
            </div>
          ) : (
            children.map(child => (
              <TreeItem
                key={child.id}
                item={child}
                scope={scope}
                level={level + 1}
                onFileSelect={onFileSelect}
                selectedFileId={selectedFileId}
                parentPath={fullPath}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
