"use client";

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, MoveRight, Bot, Trash2 } from "lucide-react";
import type { DriveItem } from "./types";

export function DriveItemDropdown({
  item,
  onRename,
  onDelete,
  onMove,
  onAskAI,
}: {
  item: DriveItem;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
  onAskAI: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Actions"
          className="h-8 w-8 rounded-md border border-border/60 bg-background/50 hover:bg-muted inline-flex items-center justify-center"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100]">
        <DropdownMenuLabel className="text-xs">{item.type === "folder" ? "Folder" : "File"}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => { onRename(); }}>
          <Pencil className="mr-2 h-4 w-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { onMove(); }}>
          <MoveRight className="mr-2 h-4 w-4" /> Move
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { onAskAI(); }}>
          <Bot className="mr-2 h-4 w-4" /> Ask AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { onDelete(); }} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


