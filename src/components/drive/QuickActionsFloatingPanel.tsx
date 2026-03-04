"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  FloatingPanelRoot,
  FloatingPanelTrigger,
  FloatingPanelContent,
  FloatingPanelBody,
  FloatingPanelFooter,
  FloatingPanelCloseButton,
  FloatingPanelButton,
} from "@/components/ui/floating-panel";
import { ImageIcon, Plus, FileUp, Globe, Lock, Users } from "lucide-react";
import { VisibilityScopeSelector, type VisibilityScope } from "@/components/drive/VisibilityScopeSelector";

export function QuickActionsFloatingPanel({
  scope,
  onScopeChange,
  onCreateFolder,
  onOpenFilePicker,
  visibilityScope,
  onVisibilityScopeChange,
  allowedClientCodes,
  onAllowedClientCodesChange,
}: {
  scope: "public" | "private";
  onScopeChange: (scope: "public" | "private") => void;
  onCreateFolder: () => void;
  onOpenFilePicker: (accept?: string) => void;
  visibilityScope?: VisibilityScope;
  onVisibilityScopeChange?: (scope: VisibilityScope) => void;
  allowedClientCodes?: string[];
  onAllowedClientCodesChange?: (codes: string[]) => void;
}) {
  const actions = [
    {
      icon: <Plus className="w-4 h-4" />,
      label: "New Folder",
      action: () => onCreateFolder(),
    },
    {
      icon: <FileUp className="w-4 h-4" />,
      label: "Upload Files",
      action: () => onOpenFilePicker(),
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      label: "Upload Image",
      action: () => onOpenFilePicker("image/*"),
    },
  ];

  const visibilityIcon = {
    internal: Lock,
    public: Globe,
    restricted: Users,
  }[visibilityScope || 'internal'];

  const VisIcon = visibilityIcon;

  return (
    <FloatingPanelRoot>
      <FloatingPanelTrigger
        title="Quick Actions"
        className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-border/60 bg-background/50 supports-[backdrop-filter]:backdrop-blur-md hover:bg-muted transition-colors"
      >
        <VisIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm font-medium capitalize">{visibilityScope || 'internal'}</span>
        <span className="text-xs text-muted-foreground">▼</span>
      </FloatingPanelTrigger>
      <FloatingPanelContent className="w-72">
        <FloatingPanelBody className="space-y-3">
          {/* Visibility Scope Section */}
          {visibilityScope !== undefined && onVisibilityScopeChange && (
            <div className="pb-2 border-b border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                Upload Synlighet
              </p>
              <VisibilityScopeSelector
                value={visibilityScope}
                onChange={onVisibilityScopeChange}
                selectedClientCodes={allowedClientCodes || []}
                onClientCodesChange={onAllowedClientCodesChange || (() => {})}
                compact
              />
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Actions
            </p>
            <AnimatePresence>
              {actions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <FloatingPanelButton
                    onClick={action.action}
                    className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    {action.icon}
                    <span className="text-sm">{action.label}</span>
                  </FloatingPanelButton>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </FloatingPanelBody>
        <FloatingPanelFooter>
          <FloatingPanelCloseButton />
        </FloatingPanelFooter>
      </FloatingPanelContent>
    </FloatingPanelRoot>
  );
}


