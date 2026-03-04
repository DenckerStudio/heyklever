"use client";

import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Folder as FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DriveItemDropdown } from "./DriveItemDropdown";
import { FileContextMenu } from "./FileContextMenu";
import type { DriveItem } from "./types";
import { getFileIconByName } from "./fileIcons";

export function ItemCard({
  item,
  onRename,
  onDelete,
  onMove,
  onAskAI,
  viewMode = "grid",
}: {
  item: DriveItem;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
  onAskAI: () => void;
  viewMode?: "grid" | "list";
}) {
  const isFolder = item.type === "folder";
  const fileIcon = isFolder ? null : getFileIconByName(item.name, item.mimeType);

  if (viewMode === "list") {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className={cn(
            "group rounded-lg p-3 flex items-center gap-3 transition-all",
            "border border-white/10 bg-white/5 supports-[backdrop-filter]:backdrop-blur-md",
            "hover:border-white/20 hover:bg-white/7.5 hover:shadow-sm"
          )}>
            <div className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
              isFolder ? "bg-blue-500/15 text-blue-500" : "bg-emerald-500/15 text-emerald-600"
            )}>
              {isFolder ? (
                <FolderIcon className="h-3 w-3" />
              ) : fileIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={item.name}>{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {item.type === "file" ? (
                  <>
                    <span>{item.size ?? "—"}</span>
                    {item.modifiedAt ? <span className="ml-2">• {item.modifiedAt}</span> : null}
                  </>
                ) : (
                  "Folder"
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {item.modifiedAt}
            </div>
            <DriveItemDropdown item={item} onRename={onRename} onDelete={onDelete} onMove={onMove} onAskAI={onAskAI} />
          </div>
        </ContextMenuTrigger>
        <FileContextMenu 
          file={item} 
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
        <div className={cn(
          "group rounded-xl p-3 flex flex-col gap-2 transition-all",
          "border border-white/10 bg-white/5 supports-[backdrop-filter]:backdrop-blur-md",
          "hover:border-white/20 hover:bg-white/7.5 hover:shadow-sm"
        )}>
          <div className="flex items-start justify-between gap-2">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              isFolder ? "bg-blue-500/15 text-blue-500" : "bg-emerald-500/15 text-emerald-600"
            )}>
              {isFolder ? (
                <FolderIcon className="h-5 w-5" />
              ) : fileIcon}
            </div>
            <DriveItemDropdown item={item} onRename={onRename} onDelete={onDelete} onMove={onMove} onAskAI={onAskAI} />
          </div>
          <div className="min-h-[2.5rem]">
            <div className="text-sm font-medium truncate" title={item.name}>{item.name}</div>
            <div className="mt-1 flex items-center justify-between">
              {item.type === "file" ? (
                <div className="text-xs text-muted-foreground">
                  <span>{item.size ?? "—"}</span>
                  {item.modifiedAt ? <span className="ml-2">• {item.modifiedAt}</span> : null}
                </div>
              ) : <div />}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <FileContextMenu 
        file={item} 
        onRename={onRename} 
        onDelete={onDelete} 
        onMove={onMove} 
        onAskAI={onAskAI} 
      />
    </ContextMenu>
  );
}


