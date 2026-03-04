"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  ChevronDown, 
  Folder as FolderIcon, 
  Loader2, 
} from "lucide-react";
import type { DriveItem } from "@/components/drive/types";

interface FolderSelectionTreeProps {
  scope: "public" | "private";
  onFolderSelect: (path: string) => void;
  selectedPath: string;
  /** Increment to force refetch (e.g. after creating a new folder) */
  refreshKey?: number;
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

export function FolderSelectionTree({ scope, onFolderSelect, selectedPath, refreshKey }: FolderSelectionTreeProps) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/storage/list?scope=${scope}&path=`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch folders`);
      }

      const data = await response.json();
      const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata ? 'file' : 'folder',
        provider: 'supabase_storage',
        path: file.name,
      }));
      
      // Filter out system folders/files and only keep folders
      const filteredItems = storageItems.filter(i => {
        const name = i.name.toLowerCase();
        return i.type === 'folder' && name !== "private" && name !== "public" && name !== ".keep" && name !== scope;
      });

      setItems(filteredItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchRoot();
  }, [fetchRoot, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400/70 p-2 text-center">
        {error}
      </div>
    );
  }

  // Root folder option
  const isRootSelected = selectedPath === "";

  return (
    <div className="space-y-0.5 max-h-[200px] overflow-y-auto border rounded-md p-2 bg-muted/20">
      <div 
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
          isRootSelected 
            ? "bg-primary/10 text-primary font-medium" 
            : "hover:bg-muted/50 text-foreground/80"
        )}
        onClick={() => onFolderSelect("")}
      >
        <FolderIcon className="w-4 h-4 shrink-0 fill-current opacity-50" />
        <span className="truncate">Root ({scope})</span>
      </div>

      {items.map(item => (
        <FolderTreeItem 
          key={item.id} 
          item={item} 
          scope={scope}
          level={0}
          onFolderSelect={onFolderSelect}
          selectedPath={selectedPath}
          parentPath=""
        />
      ))}
      {items.length === 0 && (
         <div className="text-xs text-muted-foreground px-2 py-1">No subfolders</div>
      )}
    </div>
  );
}

function FolderTreeItem({ 
  item, 
  scope, 
  level, 
  onFolderSelect,
  selectedPath,
  parentPath
}: { 
  item: DriveItem; 
  scope: "public" | "private";
  level: number;
  onFolderSelect: (path: string) => void;
  selectedPath: string;
  parentPath: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
  const isSelected = selectedPath === fullPath;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
          provider: 'supabase_storage',
          path: file.name, 
        }));

        setChildren(storageItems.filter(i => i.type === 'folder' && i.name !== ".keep"));
        setHasLoaded(true);
      } catch (err) {
        console.error("Failed to load folder contents", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
      e.stopPropagation();
      onFolderSelect(fullPath);
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors select-none group",
          isSelected 
            ? "bg-primary/10 text-primary font-medium" 
            : "hover:bg-muted/50 text-foreground/80"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <span 
            className="p-0.5 hover:bg-muted rounded-sm cursor-pointer"
            onClick={handleToggle}
        >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            )}
        </span>
        
        <FolderIcon className={cn(
          "w-4 h-4 shrink-0 transition-colors",
          isSelected ? "fill-primary/20 text-primary" : "text-muted-foreground group-hover:text-foreground"
        )} />
        
        <span className="truncate flex-1">{item.name}</span>
        
        {loading && <Loader2 className="w-3 h-3 animate-spin ml-auto text-muted-foreground/50" />}
      </div>

      {expanded && (
        <div className="mt-0.5">
          {children.length === 0 && !loading ? (
            <div 
              className="text-[11px] text-muted-foreground/50 py-1 pl-8 italic"
              style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}
            >
              Empty
            </div>
          ) : (
            children.map(child => (
              <FolderTreeItem
                key={child.id}
                item={child}
                scope={scope}
                level={level + 1}
                onFolderSelect={onFolderSelect}
                selectedPath={selectedPath}
                parentPath={fullPath}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

