"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  FloatingPanelRoot,
  FloatingPanelContent,
  FloatingPanelBody,
  FloatingPanelFooter,
  FloatingPanelCloseButton,
  FloatingPanelHeader,
} from "@/components/ui/floating-panel";
import { cn, normalizeFileName } from "@/lib/utils";
import { useFolderOperations } from "@/lib/hooks/useFolderOperations";
import { Folder as FolderIcon, Loader2, AlertCircle, RefreshCw, LayoutGrid, LayoutList } from "lucide-react";
import type { DriveItem } from "@/components/drive/types";
import { FolderCard } from "@/components/drive/FolderCard";
import { ItemCard } from "@/components/drive/ItemCard";
import { QuickActionsFloatingPanel } from "@/components/drive/QuickActionsFloatingPanel";
import { EmptySpaceContextMenu } from "@/components/drive/EmptySpaceContextMenu";
import { useUpload } from "@/lib/upload-context";
import { VisibilityScopeSelector, type VisibilityScope } from "@/components/drive/VisibilityScopeSelector";

interface SupabaseStorageFile {
  id?: string;
  name: string;
  metadata?: {
    mimetype?: string;
    size?: number;
  };
  created_at?: string;
  updated_at?: string;
}

interface DriveExplorerProps {
  initialItems?: DriveItem[];
  onCreateFolder?: (name: string) => Promise<void> | void;
  onRename?: (id: string, newName: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onMove?: (id: string) => Promise<void> | void;
  onAskAI?: (item: DriveItem) => Promise<void> | void;
}

export function DriveExplorer(props: DriveExplorerProps) {
  const {
    initialItems,
    onCreateFolder,
    onRename,
    onDelete,
    onMove,
    onAskAI,
  } = props;

  const { 
    addUpload, 
    updateUpload, 
    visibilityScope, 
    setVisibilityScope, 
    allowedClientCodes, 
    setAllowedClientCodes 
  } = useUpload();

  const [items, setItems] = useState<DriveItem[]>(initialItems ?? []);
  const {
    operation,
    inputValue,
    setInputValue,
    startCreateFolder,
    startRename,
    startDelete,
    handleSubmit,
    handleCancel,
  } = useFolderOperations();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerFilter] = useState<"all" | "supabase_storage">("all");
  const [scope, setScope] = useState<"public" | "private">("public");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFiles, setDragFiles] = useState<File[]>([]);
  const [showDropPopover, setShowDropPopover] = useState(false);
  const [teamFolderMissing, setTeamFolderMissing] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("driveViewMode") as "grid" | "list") || "grid";
    }
    return "grid";
  });
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleItems = useMemo(
    () => {
      const filtered = items.filter((i) => {
        // Filter by provider
        if (providerFilter !== "all" && i.provider !== providerFilter) return false;
        
        // Filter out scope folders (Private and Public) - these should never be displayed
        // Check both folder and file types since the API might return them as files
        const isScopeFolder = (
          i.name === "Private" || 
          i.name === "Public" || 
          i.name.toLowerCase() === "private" || 
          i.name.toLowerCase() === "public"
        );
        
        if (isScopeFolder) {
          return false;
        }
        
        // Filter out any items that are the current scope folder name (case insensitive)
        if (i.name.toLowerCase() === scope.toLowerCase()) {
          return false;
        }
        
        // Filter out .keep files (placeholder files for empty folders)
        if (i.name === '.keep') {
          return false;
        }
        
        return true;
      });
      return filtered;
    },
    [items, providerFilter, scope]
  );

  const folders = useMemo(() => visibleItems.filter((i) => i.type === "folder"), [visibleItems]);
  const files = useMemo(() => visibleItems.filter((i) => i.type === "file"), [visibleItems]);

  // Fetch files and team folders from API
  useEffect(() => {
    const fetchData = async () => {
      if (initialItems) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch storage files
        const storageResponse = await fetch(`/api/storage/list?scope=${scope}&path=${encodeURIComponent(currentPath)}`);
        
        if (!storageResponse.ok) {
          throw new Error(`Failed to fetch storage files: ${storageResponse.status}`);
        }

        const storageData = await storageResponse.json();
        
        // Convert Supabase Storage files to DriveItem format
        const storageItems: DriveItem[] = (storageData.files || []).map((file: SupabaseStorageFile) => ({
          id: file.id || file.name,
          name: file.name,
          // Supabase returns folders with metadata=null
          type: file.metadata ? 'file' : 'folder',
          size: file.metadata?.size ? formatFileSize(file.metadata.size) : undefined,
          modifiedAt: file.updated_at ? new Date(file.updated_at).toLocaleDateString() : undefined,
          provider: 'supabase_storage',
          path: file.name,
          created_at: file.created_at,
          updated_at: file.updated_at,
          mimeType: file.metadata?.mimetype
        }));
        
        // console.log('Raw storage items before filtering:', storageItems.map(item => ({ name: item.name, type: item.type })));
        
        setItems(storageItems);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialItems, scope, currentPath]);

  const handleRefresh = async () => {
    if (initialItems) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/storage/list?scope=${scope}&path=${encodeURIComponent(currentPath)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch storage files: ${response.status}`);
      }

      const data = await response.json();
      
      // Convert Supabase Storage files to DriveItem format
      const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata ? 'file' : 'folder',
        size: file.metadata?.size ? formatFileSize(file.metadata.size) : undefined,
        modifiedAt: file.updated_at ? new Date(file.updated_at).toLocaleDateString() : undefined,
        provider: 'supabase_storage',
        path: file.name,
        created_at: file.created_at,
        updated_at: file.updated_at,
        mimeType: file.metadata?.mimetype
      }));
      
      setItems(storageItems);
    } catch (err) {
      console.error("Error refreshing files:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh files");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = () => {
    startCreateFolder(async (name) => {
      try {
        // Call API to create folder at currentPath within selected scope
        const response = await fetch('/api/storage/folder/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, path: currentPath, folderName: name }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Failed to create folder (${response.status})`);
        }
        // refresh list to show newly created folder
        await handleRefresh();
        await onCreateFolder?.(name);
      } catch (e) {
        alert(`Create folder failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    });
  };

  const handleRename = async (item: DriveItem) => {
    startRename(item.name, async (newName) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, name: newName } : i)));
    await onRename?.(item.id, newName);
    });
  };

  const handleDelete = async (item: DriveItem) => {
    startDelete(item.name, async () => {
      try {
        // Construct the full path for deletion
        const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        
        const response = await fetch(`/api/storage/delete?scope=${scope}&path=${encodeURIComponent(itemPath)}&isFolder=${item.type === "folder"}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete ${item.type}: ${response.status}`);
        }

        // Remove from local state
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        
        // Call the optional callback
        await onDelete?.(item.id);
        
        console.log(`Successfully deleted ${item.type}:`, item.name);
      } catch (error) {
        console.error('Delete failed:', error);
        alert(`Failed to delete ${item.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't remove from state if deletion failed
      }
    });
  };

  const handleMove = async (item: DriveItem) => {
    // Placeholder: you can replace with a real move dialog later
    await onMove?.(item.id);
    alert("Move dialog not implemented yet");
  };

  const handleAskAI = async (item: DriveItem) => {
    await onAskAI?.(item);
    window.location.href = `/dashboard/chat?context=${encodeURIComponent(item.name)}`;
  };

  const handleFolderClick = (folder: DriveItem) => {
    if (folder.type === "folder") {
      // Only allow navigation within the current scope (Private or Public)
      const newPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
      setPathHistory(prev => [...prev, currentPath]);
      setCurrentPath(newPath);
    }
  };

  const _handleBreadcrumbClick = (index: number) => {
    const newPath = pathHistory[index] || "";
    setCurrentPath(newPath);
    setPathHistory(prev => prev.slice(0, index));
  };

  const handleBackClick = () => {
    if (pathHistory.length > 0) {
      const newPath = pathHistory[pathHistory.length - 1];
      setCurrentPath(newPath);
      setPathHistory(prev => prev.slice(0, -1));
    }
  };

  const handleScopeChange = (newScope: "public" | "private") => {
    setScope(newScope);
    // Reset navigation when switching scopes
    setCurrentPath("");
    setPathHistory([]);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
      setDragOverFolder(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setDragFiles(files);
    setIsDragging(false);
    setDragOverFolder(null);

    // Upload files to current path or specific folder
    const targetPath = dragOverFolder || currentPath;
    await uploadFilesToPath(files, targetPath);
  };

  const uploadFilesToPath = async (files: File[], targetPath: string) => {
    const uploadPromises = files.map(async (file) => {
      // Normalize filename to handle special characters and spaces
      const normalizedFileName = normalizeFileName(file.name);
      
      // Add upload to context (use original name for display)
      const uploadId = addUpload(file);

      try {
        // Get signed upload URL
        const response = await fetch('/api/storage/upload/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileSize: file.size,
            contentType: file.type,
            scope,
            path: targetPath,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Upload API error:', errorData);
          
          if (response.status === 404 && errorData.error?.includes('Team folder not found')) {
            setTeamFolderMissing(true);
            updateUpload(uploadId, {
              status: 'error',
              progress: 0,
              error: 'Team folder not found',
            });
            return;
          }
          
          throw new Error(`Failed to get upload URL: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }

        const { uploadUrl, token, path: objectPath, bucketId } = await response.json();

        // Upload file to Supabase Storage with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              updateUpload(uploadId, { progress: percentComplete });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed: Network error'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });

          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(file);
        });

        // Mark upload as successful
        updateUpload(uploadId, { status: 'success', progress: 100 });

        // Forward file to n8n ingest for processing
        try {
          if (objectPath && bucketId) {
            const lower = file.name.toLowerCase();
            let content = '';
            
            // Extract text for text-like files that can be read directly
            if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || 
                lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.html') || 
                lower.endsWith('.css') || lower.endsWith('.js') || lower.endsWith('.ts')) {
              try {
                content = await file.text();
              } catch (e) {
                console.warn('Failed to extract text from file:', file.name, e);
                content = '';
              }
            }
            
            const ingestResponse = await fetch('/api/storage/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                context: scope,
                bucketId,
                objectPath,
                fileName: normalizedFileName,
                content: content,
                // Enhanced metadata for document visibility control
                visibilityScope,
                allowedClientCodes: visibilityScope === 'restricted' ? allowedClientCodes : [],
              }),
            });
            
            if (!ingestResponse.ok) {
              const errorText = await ingestResponse.text();
              console.error('Ingest request failed:', ingestResponse.status, errorText);
            } else {
              console.log('File successfully sent to ingest:', file.name);
            }
          } else {
            console.warn('Missing objectPath or bucketId for file:', file.name);
          }
        } catch (e) {
          console.error('Ingest forwarding failed:', e);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        updateUpload(uploadId, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Wait for all uploads to complete
    await Promise.allSettled(uploadPromises);

    // Refresh the file list after a short delay
    setTimeout(() => {
      handleRefresh();
    }, 500);
  };

  const openFilePicker = (accept?: string) => {
    const inputEl = fileInputRef.current;
    if (!inputEl) return;
    inputEl.accept = accept ?? "";
    inputEl.multiple = true;
    inputEl.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;
    await uploadFilesToPath(selectedFiles, currentPath);
    // Reset the input so selecting the same file again will trigger change
    e.target.value = "";
  };

  const handleFolderDragOver = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderName);
    setShowDropPopover(true);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null);
      setShowDropPopover(false);
    }
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("driveViewMode", mode);
    }
  };

  const handleCreateTeamStorage = async () => {
    setCreatingFolder(true);
    try {
      const response = await fetch('/api/teams/folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'supabase_storage',
          teamName: 'Team Storage', // You might want to get this from props or context
          teamMemberEmails: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Team storage creation error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create team storage');
      }

      const result = await response.json();
      console.log('Team storage created:', result);
      
      // Refresh the file list
      await handleRefresh();
      setTeamFolderMissing(false);
    } catch (error) {
      console.error('Failed to create team storage:', error);
      alert(`Failed to create team storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  

  if (loading) {
    return (
      <div className="h-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Drive</span>
          <span>/</span>
          <span className="text-foreground">Home</span>
        </div>
          <div className="flex items-center gap-3">
            <QuickActionsFloatingPanel 
              scope={scope}
              onScopeChange={handleScopeChange}
              onCreateFolder={handleCreateFolder}
              onOpenFilePicker={openFilePicker}
              visibilityScope={visibilityScope}
              onVisibilityScopeChange={setVisibilityScope}
              allowedClientCodes={allowedClientCodes}
              onAllowedClientCodesChange={setAllowedClientCodes}
            />
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center h-full py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading your files...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full space-y-5 z-10 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Storage</span>
            <span>/</span>
            {currentPath ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBackClick}
                  className="hover:text-foreground transition-colors"
                  disabled={pathHistory.length === 0}
                >
                  <span className="text-blue-500">←</span>
                </button>
                <span className="text-foreground">{currentPath}</span>
              </div>
            ) : (
              <span className="text-foreground">Home</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <QuickActionsFloatingPanel 
              scope={scope}
              onScopeChange={handleScopeChange}
              onCreateFolder={handleCreateFolder}
              onOpenFilePicker={openFilePicker}
              visibilityScope={visibilityScope}
              onVisibilityScopeChange={setVisibilityScope}
              allowedClientCodes={allowedClientCodes}
              onAllowedClientCodesChange={setAllowedClientCodes}
            />
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center h-full py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-medium">Failed to load files</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FloatingPanelRoot className="h-full rounded-2xl p-6 border-dashed border border-black/30 dark:border-white/30">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            ref={dropZoneRef}
            className={cn(
              "h-full space-y-5 transition-all duration-200",
              isDragging && "bg-blue-50/50 dark:bg-blue-900/20 rounded-lg"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
          {/* Hidden file input for Quick Actions uploads */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Storage</span>
            <span>/</span>
            <span className="text-foreground capitalize">{scope}</span>
            {currentPath && (
              <div className="flex items-center gap-1">
                <span>/</span>
                <button
                  onClick={handleBackClick}
                  className="hover:text-foreground transition-colors"
                  disabled={pathHistory.length === 0}
                >
                  <span className="text-blue-500">←</span>
                </button>
                <span className="text-foreground">{currentPath}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <QuickActionsFloatingPanel 
              scope={scope}
              onScopeChange={handleScopeChange}
              onCreateFolder={handleCreateFolder}
              onOpenFilePicker={openFilePicker}
              visibilityScope={visibilityScope}
              onVisibilityScopeChange={setVisibilityScope}
              allowedClientCodes={allowedClientCodes}
              onAllowedClientCodesChange={setAllowedClientCodes}
            />
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/50 supports-[backdrop-filter]:backdrop-blur-md p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("grid")}
                className="h-8 w-8 p-0"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("list")}
                className="h-8 w-8 p-0"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
              />
              Refresh
            </Button>
            
        </div>
      </div>

      {folders.length > 0 && (
           <section className="h-full">
             <h3 className="text-xs font-medium mb-3 text-muted-foreground">
               Folders
             </h3>
             <div
               className={cn(
                 viewMode === "grid"
                   ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
                   : "flex flex-col space-y-2"
               )}
             >
            {folders.map((folder) => (
                <FolderCard
                key={folder.id}
                  folder={folder}
                  onClick={() => handleFolderClick(folder)}
                onRename={() => handleRename(folder)}
                onDelete={() => handleDelete(folder)}
                onMove={() => handleMove(folder)}
                onAskAI={() => handleAskAI(folder)}
                  isDragOver={dragOverFolder === folder.name}
                  onDragOver={(e) => handleFolderDragOver(e, folder.name)}
                  onDragLeave={handleFolderDragLeave}
                  viewMode={viewMode}
              />
            ))}
          </div>
        </section>
      )}

      {files.length > 0 && (
           <section className="h-full">
             <h3 className="text-xs font-medium mb-2 text-muted-foreground">
               Files
             </h3>
             <div
               className={cn(
                 viewMode === "grid"
                   ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
                   : "flex flex-col space-y-2"
               )}
             >
            {files.map((file) => (
              <ItemCard
                key={file.id}
                item={file}
                onRename={() => handleRename(file)}
                onDelete={() => handleDelete(file)}
                onMove={() => handleMove(file)}
                onAskAI={() => handleAskAI(file)}
                  viewMode={viewMode}
              />
            ))}
          </div>
        </section>
      )}

         {teamFolderMissing ? (
           <div className="flex flex-col items-center justify-center h-full py-12 text-center">
             <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
               <FolderIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
    </div>
             <h3 className="text-sm font-medium text-muted-foreground mb-1">
               Team Storage Not Set Up
             </h3>
             <p className="text-xs text-muted-foreground mb-4">
               Your team storage needs to be created before you can upload files.
             </p>
             <Button
               onClick={handleCreateTeamStorage}
               disabled={creatingFolder}
               className="bg-blue-600 hover:bg-blue-700 text-white"
             >
               {creatingFolder ? (
                 <>
                   <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                   Creating Storage...
                 </>
               ) : (
                 <>
                   <FolderIcon className="h-4 w-4 mr-2" />
                   Create Team Storage
                 </>
               )}
             </Button>
           </div>
         ) : (
           folders.length === 0 &&
           files.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full py-12 text-center">
               <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                 <FolderIcon className="h-8 w-8 text-muted-foreground" />
               </div>
               <h3 className="text-sm font-medium text-muted-foreground mb-1">
                 No files found
               </h3>
               <p className="text-xs text-muted-foreground">
                 {currentPath
                   ? `No files found in ${scope}/${currentPath}`
                   : `No files found in ${scope} folder`}
               </p>
             </div>
           )
         )}

        {/* Drag and drop overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-indigo-500/10 backdrop-blur-xs z-50 flex items-center justify-center">
            <div className=" rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FolderIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Drop your files to upload
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dragOverFolder
                      ? `Add files to "${dragOverFolder}" folder`
                      : `Add files to ${scope} folder${currentPath ? `/${currentPath}` : ""}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Animated tooltip for drag feedback */}
        {showDropPopover && dragOverFolder && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in-0 duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-blue-200 dark:border-blue-700 relative">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Add{" "}
                {dragFiles.length > 0
                  ? `${dragFiles.length} file${dragFiles.length > 1 ? "s" : ""}`
                  : "files"}{" "}
                to &quot;{dragOverFolder}&quot;
              </div>
              {/* Tooltip arrow */}
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-blue-200 dark:border-blue-700 transform rotate-45"></div>
            </div>
          </div>
        )}
          </div>
        </ContextMenuTrigger>
        <EmptySpaceContextMenu
          onCreateFolder={handleCreateFolder}
          onOpenFilePicker={() => openFilePicker()}
          onRefresh={handleRefresh}
          onViewModeChange={handleViewModeChange}
        />
      </ContextMenu>

      {/* Floating Panel for Folder Operations */}
      <FloatingPanelContent className="w-80">
        <FloatingPanelHeader>
          {operation?.type === "create"
            ? "Create New Folder"
            : operation?.type === "rename"
              ? "Rename Folder"
              : "Delete Item"}
        </FloatingPanelHeader>
        <FloatingPanelBody>
          <div className="space-y-4">
            {operation?.type === "delete" ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete{" "}
                  <strong>&ldquo;{operation.currentName}&rdquo;</strong>?
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  This action cannot be undone.
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="folder-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {operation?.type === "create" ? "Folder Name" : "New Name"}
                </label>
                <input
                  id="folder-name"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    operation?.type === "create"
                      ? "Enter folder name..."
                      : "Enter new name..."
                  }
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit();
                    } else if (e.key === "Escape") {
                      handleCancel();
                    }
                  }}
                />
              </div>
            )}
          </div>
        </FloatingPanelBody>
        <FloatingPanelFooter>
          <FloatingPanelCloseButton />
          {operation?.type === "delete" ? (
            <Button
              onClick={handleSubmit}
              variant="destructive"
              className="ml-2"
            >
              Delete
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="ml-2"
            >
              {operation?.type === "create" ? "Create" : "Rename"}
            </Button>
          )}
        </FloatingPanelFooter>
      </FloatingPanelContent>
    </FloatingPanelRoot>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
