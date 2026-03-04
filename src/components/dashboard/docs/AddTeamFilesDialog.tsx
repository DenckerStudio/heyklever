"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Modal, 
  ModalBody, 
  ModalContent, 
  ModalFooter,
} from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, Loader2, Lock, Globe, FileText } from "lucide-react";
import { TreeView, TreeNode } from "@/components/ui/tree-view";
import type { DriveItem } from "@/components/drive/types";

interface AddTeamFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onConfirm: (targetPath: string, newFileName: string) => Promise<void>;
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

export function AddTeamFilesDialog({ open, onOpenChange, fileName, onConfirm }: AddTeamFilesDialogProps) {
  const [scope, setScope] = useState<"Public" | "Private">("Private");
  const [selectedPath, setSelectedPath] = useState("");
  const [newFileName, setNewFileName] = useState(fileName);
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const fetchFolders = useCallback(async () => {
    setTreeLoading(true);
    try {
      const response = await fetch(`/api/storage/list?scope=${scope.toLowerCase()}&path=`);
      
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
        return i.type === 'folder' && name !== "private" && name !== "public" && name !== ".keep" && name !== scope.toLowerCase();
      });

      // Convert to TreeNode format
      const rootNode: TreeNode = {
        id: "root",
        label: `Root (${scope})`,
        icon: <Folder className="h-4 w-4" />,
        children: filteredItems.map(item => convertDriveItemToTreeNode(item, scope.toLowerCase() as "public" | "private", "")),
        data: { path: "" }
      };

      setTreeData([rootNode]);
    } catch (err) {
      console.error("Failed to load folders:", err);
      setTreeData([]);
    } finally {
      setTreeLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (open) {
      setNewFileName(fileName);
      setSelectedPath("");
      setExpandedIds([]);
      fetchFolders();
    }
  }, [open, fileName, scope, fetchFolders]);

  const convertDriveItemToTreeNode = (
    item: DriveItem, 
    scope: "public" | "private", 
    parentPath: string
  ): TreeNode => {
    const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
    
    return {
      id: fullPath,
      label: item.name,
      icon: <Folder className="h-4 w-4" />,
      children: [], // Will be loaded lazily
      data: { 
        path: fullPath,
        scope,
        parentPath,
        hasLoaded: false
      }
    };
  };

  const updateTreeNodeChildren = useCallback((nodes: TreeNode[], targetId: string, children: TreeNode[]): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateTreeNodeChildren(node.children, targetId, children) };
      }
      return node;
    });
  }, []);

  const markNodeAsLoaded = useCallback((nodes: TreeNode[], targetId: string): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, data: { ...node.data, hasLoaded: true } };
      }
      if (node.children) {
        return { ...node, children: markNodeAsLoaded(node.children, targetId) };
      }
      return node;
    });
  }, []);

  const loadChildren = useCallback(async (node: TreeNode) => {
    if (node.data?.hasLoaded || !node.data?.path) return;
    
    try {
      const response = await fetch(`/api/storage/list?scope=${node.data.scope}&path=${encodeURIComponent(node.data.path)}`);
      const data = await response.json();
      
      const storageItems: DriveItem[] = (data.files || []).map((file: SupabaseStorageFile) => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata ? 'file' : 'folder',
        provider: 'supabase_storage',
        path: file.name,
      }));

      const folders = storageItems.filter(i => i.type === 'folder' && i.name !== ".keep");
      
      setTreeData(prevTree => {
        // Update the node's children
        const updatedTree = updateTreeNodeChildren(prevTree, node.id, folders.map(item => 
          convertDriveItemToTreeNode(item, node.data.scope, node.data.path)
        ));
        
        // Mark as loaded
        return markNodeAsLoaded(updatedTree, node.id);
      });
    } catch (err) {
      console.error("Failed to load folder contents", err);
    }
  }, [updateTreeNodeChildren, markNodeAsLoaded]);


  const findNodeById = useCallback((nodes: TreeNode[], targetId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      if (node.children) {
        const found = findNodeById(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleNodeExpand = useCallback((nodeId: string, expanded: boolean) => {
    if (expanded) {
      setExpandedIds(prev => [...prev, nodeId]);
      setTreeData(prevTree => {
        const node = findNodeById(prevTree, nodeId);
        if (node) {
          loadChildren(node);
        }
        return prevTree;
      });
    } else {
      setExpandedIds(prev => prev.filter(id => id !== nodeId));
    }
  }, [findNodeById, loadChildren]);

  const handleNodeClick = useCallback((node: TreeNode) => {
    const path = node.data?.path || "";
    setSelectedPath(path === "root" ? "" : path);
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const path = selectedPath ? `${scope}/${selectedPath}` : scope;
      await onConfirm(path, newFileName);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const finalPath = `${scope}/${selectedPath ? `${selectedPath}/` : ''}${newFileName}`;

  return (
    <Modal open={open} setOpen={onOpenChange}>
      <ModalBody className="max-w-[600px] min-h-0 h-auto">
        <ModalContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Folder className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Add to Team Files</h2>
                <p className="text-sm text-muted-foreground">Save this document to your team&apos;s knowledge base</p>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scope</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={scope === "Private" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setScope("Private")}
                  className="flex-1 gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Private
                </Button>
                <Button 
                  type="button" 
                  variant={scope === "Public" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setScope("Public")}
                  className="flex-1 gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Public
                </Button>
              </div>
            </div>

            {/* File Name Input */}
            <div className="space-y-2">
              <Label htmlFor="filename" className="text-sm font-medium">File Name</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter file name"
                className="h-10"
              />
            </div>

            {/* Folder Selection Tree */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Destination Folder</Label>
              {treeLoading ? (
                <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/20">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-h-[280px] overflow-hidden">
                  <TreeView
                    data={treeData}
                    onNodeClick={handleNodeClick}
                    onNodeExpand={handleNodeExpand}
                    defaultExpandedIds={expandedIds}
                    selectedIds={selectedPath === "" ? ["root"] : [selectedPath]}
                    onSelectionChange={(ids) => {
                      const id = ids[0] || "";
                      setSelectedPath(id === "root" ? "" : id);
                    }}
                    selectable={true}
                    showLines={true}
                    showIcons={true}
                    indent={20}
                    animateExpand={true}
                    className="border-0 bg-transparent"
                  />
                </div>
              )}
            </div>

            {/* Preview Path */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-border/50">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Destination path</p>
                <p className="text-sm font-mono text-foreground truncate">{finalPath}</p>
              </div>
            </div>
          </div>

          <ModalFooter className="mt-6 gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              type="submit" 
              onClick={handleSubmit} 
              disabled={loading || !newFileName.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Folder className="w-4 h-4" />
                  Save to Files
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </ModalBody>
    </Modal>
  );
}
