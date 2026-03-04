"use client";

import React, { useState } from "react";
import { Loader2, FolderOpen, FolderPlus, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderSelectionTree } from "@/components/dashboard/docs/FolderSelectionTree";
import {
  VisibilityScopeSelector,
  type VisibilityScope,
} from "@/components/drive/VisibilityScopeSelector";

export interface SaveOptions {
  folderPath: string;
  scope: "public" | "private";
  visibilityScope: VisibilityScope;
  allowedClientCodes: string[];
}

interface SaveToStorageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (options: SaveOptions) => Promise<void>;
  saving: boolean;
  submitLabel?: string;
  title?: string;
  description?: string;
}

export function SaveToStorageModal({
  open,
  onOpenChange,
  onSave,
  saving,
  submitLabel = "Save & Train AI",
  title = "Save to Storage",
  description = "Choose where to save the document and set visibility options.",
}: SaveToStorageModalProps) {
  const [saveScope, setSaveScope] = useState<"public" | "private">("public");
  const [selectedFolderPath, setSelectedFolderPath] = useState("");
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>("internal");
  const [allowedClientCodes, setAllowedClientCodes] = useState<string[]>([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderTreeRefreshKey, setFolderTreeRefreshKey] = useState(0);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    setFolderError(null);
    try {
      const res = await fetch("/api/storage/folder/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: saveScope,
          path: selectedFolderPath,
          folderName: name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create folder");
      }
      const newPath = selectedFolderPath ? `${selectedFolderPath}/${name}` : name;
      setSelectedFolderPath(newPath);
      setNewFolderName("");
      setShowNewFolderInput(false);
      setFolderTreeRefreshKey((k) => k + 1);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await onSave({
        folderPath: selectedFolderPath,
        scope: saveScope,
        visibilityScope,
        allowedClientCodes: visibilityScope === "restricted" ? allowedClientCodes : [],
      });
      onOpenChange(false);
    } catch {
      // Caller handles error
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFolderError(null);
      setShowNewFolderInput(false);
      setNewFolderName("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scope Tabs */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Storage Location</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={saveScope === "public" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSaveScope("public");
                  setSelectedFolderPath("");
                }}
                className="flex-1"
              >
                Public
              </Button>
              <Button
                type="button"
                variant={saveScope === "private" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSaveScope("private");
                  setSelectedFolderPath("");
                }}
                className="flex-1"
              >
                Private
              </Button>
            </div>
          </div>

          {/* Folder Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Select Folder</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setShowNewFolderInput(true);
                  setFolderError(null);
                }}
                disabled={showNewFolderInput}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New folder
              </Button>
            </div>
            {showNewFolderInput && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                      setFolderError(null);
                    }
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                >
                  {creatingFolder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName("");
                    setFolderError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
            {folderError && <p className="text-xs text-red-500">{folderError}</p>}
            <FolderSelectionTree
              scope={saveScope}
              onFolderSelect={setSelectedFolderPath}
              selectedPath={selectedFolderPath}
              refreshKey={folderTreeRefreshKey}
            />
            {selectedFolderPath && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Selected:</span>
                <code className="px-1.5 py-0.5 rounded bg-muted">
                  {saveScope}/{selectedFolderPath || "Root"}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setSelectedFolderPath("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Visibility Scope */}
          <VisibilityScopeSelector
            value={visibilityScope}
            onChange={setVisibilityScope}
            selectedClientCodes={allowedClientCodes}
            onClientCodesChange={setAllowedClientCodes}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
