"use client";

import { Folder as FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { DriveItem } from "./types";
import { FolderContextMenu } from "./FolderContextMenu";
import { DriveItemDropdown } from "./DriveItemDropdown";

export function FolderCard({
  folder,
  onClick,
  onRename,
  onDelete,
  onMove,
  onAskAI,
  isDragOver,
  onDragOver,
  onDragLeave,
  viewMode = "grid",
}: {
  folder: DriveItem;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
  onAskAI: () => void;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  viewMode?: "grid" | "list";
}) {
  if (viewMode === "list") {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            className={cn(
              "group relative rounded-lg p-3 transition-all cursor-pointer",
              "border border-gray-200/50 bg-white/80 dark:border-gray-700/50 dark:bg-gray-800/80",
              "hover:border-blue-300/50 hover:bg-blue-50/50 dark:hover:border-blue-500/50 dark:hover:bg-blue-900/20",
              "hover:shadow-md hover:shadow-blue-500/10",
              isDragOver && "border-blue-400 bg-blue-100 dark:border-blue-500 dark:bg-blue-900/40 scale-105 shadow-lg"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <button
              onClick={onClick}
              className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                  isDragOver 
                    ? "bg-blue-200 dark:bg-blue-800" 
                    : "bg-blue-100 dark:bg-blue-900/30"
                )}>
                  <FolderIcon className={cn(
                    "h-3 w-3 transition-colors",
                    isDragOver 
                      ? "text-blue-700 dark:text-blue-300" 
                      : "text-blue-600 dark:text-blue-400"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={folder.name}>
                    {folder.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isDragOver ? "Drop files here" : "Folder"}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {folder.modifiedAt}
                </div>
              </div>
            </button>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DriveItemDropdown item={folder} onRename={onRename} onDelete={onDelete} onMove={onMove} onAskAI={onAskAI} />
            </div>
          </div>
        </ContextMenuTrigger>
        <FolderContextMenu 
          folder={folder} 
          onRename={onRename} 
          onDelete={onDelete} 
          onMove={onMove} 
          onAskAI={onAskAI} 
        />
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className={cn(
            "group relative rounded-lg p-4 transition-all cursor-pointer",
            "border border-gray-200/50 bg-white/80 dark:border-gray-700/50 dark:bg-gray-800/80",
            "hover:border-blue-300/50 hover:bg-blue-50/50 dark:hover:border-blue-500/50 dark:hover:bg-blue-900/20",
            "hover:shadow-md hover:shadow-blue-500/10",
            isDragOver && "border-blue-400 bg-blue-100 dark:border-blue-500 dark:bg-blue-900/40 scale-105 shadow-lg"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <button
            onClick={onClick}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
                isDragOver 
                  ? "bg-blue-200 dark:bg-blue-800" 
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}>
                <FolderIcon className={cn(
                  "h-4 w-4 transition-colors",
                  isDragOver 
                    ? "text-blue-700 dark:text-blue-300" 
                    : "text-blue-600 dark:text-blue-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={folder.name}>
                  {folder.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isDragOver ? "Drop files here" : "Folder"}
                </div>
              </div>
            </div>
          </button>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DriveItemDropdown item={folder} onRename={onRename} onDelete={onDelete} onMove={onMove} onAskAI={onAskAI} />
          </div>
        </div>
      </ContextMenuTrigger>
      <FolderContextMenu 
        folder={folder} 
        onRename={onRename} 
        onDelete={onDelete} 
        onMove={onMove} 
        onAskAI={onAskAI} 
      />
    </ContextMenu>
  );
}


