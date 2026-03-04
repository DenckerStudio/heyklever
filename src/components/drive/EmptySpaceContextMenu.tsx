"use client";

import { LayoutGrid, LayoutList, ImageIcon, Plus, RefreshCw, Share, Copy } from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";

export function EmptySpaceContextMenu({
  onCreateFolder,
  onOpenFilePicker,
  onRefresh,
  onViewModeChange,
}: {
  onCreateFolder: () => void;
  onOpenFilePicker: () => void;
  onRefresh: () => void;
  onViewModeChange: (mode: "grid" | "list") => void;
}) {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuLabel>Quick Actions</ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onCreateFolder}>
        <Plus className="mr-2 h-4 w-4" />
        New Folder
        <ContextMenuShortcut>Ctrl+Shift+N</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={onOpenFilePicker}>
        <ImageIcon className="mr-2 h-4 w-4" />
        Upload Files
        <ContextMenuShortcut>Ctrl+U</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => {}} disabled>
        <Copy className="mr-2 h-4 w-4" />
        Paste
        <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Share className="mr-2 h-4 w-4" />
          Share Folder
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </ContextMenuItem>
          <ContextMenuItem>
            <Share className="mr-2 h-4 w-4" />
            Share with Team
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onRefresh}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
        <ContextMenuShortcut>F5</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <LayoutGrid className="mr-2 h-4 w-4" />
          View Options
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => onViewModeChange("grid")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grid View
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onViewModeChange("list")}>
            <LayoutList className="mr-2 h-4 w-4" />
            List View
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  );
}


