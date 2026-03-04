"use client";

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
import { Bot, Copy, Download, Edit3, Eye, MoveRight, Share, Trash2 } from "lucide-react";
import type { DriveItem } from "./types";

export function FileContextMenu({
  file: _file,
  onRename,
  onDelete,
  onMove,
  onAskAI,
}: {
  file: DriveItem;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
  onAskAI: () => void;
}) {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuLabel>File Actions</ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => {}}>
        <Eye className="mr-2 h-4 w-4" />
        Open
        <ContextMenuShortcut>Enter</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onClick={() => {}}>
        <Download className="mr-2 h-4 w-4" />
        Download
        <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onClick={onRename}>
        <Edit3 className="mr-2 h-4 w-4" />
        Rename
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Share className="mr-2 h-4 w-4" />
          Share
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
      <ContextMenuItem onClick={onMove}>
        <MoveRight className="mr-2 h-4 w-4" />
        Move
        <ContextMenuShortcut>Ctrl+M</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onAskAI}>
        <Bot className="mr-2 h-4 w-4" />
        Ask AI about file
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onDelete} variant="destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}


