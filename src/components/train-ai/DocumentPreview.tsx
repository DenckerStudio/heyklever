"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  RefreshCw,
  Download,
  Copy,
  Check,
  FileText,
  Sparkles,
  MessageSquarePlus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Input } from "@/components/ui/input";
import { SaveToStorageModal, type SaveOptions } from "./SaveToStorageModal";

export type { SaveOptions };

interface DocumentPreviewProps {
  document: string;
  isGenerating: boolean;
  outputType: string;
  onApprove: (editedDocument: string, saveOptions?: SaveOptions) => void;
  onRegenerate: () => void;
}

export interface DocumentAnnotation {
  id: string;
  quote: string;
  text: string;
  createdAt: number;
}

const outputTypeLabels: Record<string, string> = {
  "user-manual": "User Manual",
  documentation: "Documentation",
  "step-by-step": "Step-by-Step Guide",
  "blog-post": "Blog Post",
  custom: "Custom Document",
};

const POPOVER_WIDTH_COMPACT = 260;
const POPOVER_EST_HEIGHT = 80;
const GAP_ABOVE_SELECTION = 8;
const CONTAINER_PADDING = 8;

function getPopoverPositionInContainer(
  selectionRect: DOMRect,
  container: HTMLDivElement
): { top: number; left: number } {
  const containerRect = container.getBoundingClientRect();
  const scrollTop = container.scrollTop;
  const scrollLeft = container.scrollLeft;
  const containerWidth = container.clientWidth;

  const selectionCenterX = selectionRect.left - containerRect.left + scrollLeft + selectionRect.width / 2;
  let left = selectionCenterX - POPOVER_WIDTH_COMPACT / 2;
  left = Math.max(CONTAINER_PADDING, Math.min(containerWidth - POPOVER_WIDTH_COMPACT - CONTAINER_PADDING, left));

  const selectionTop = selectionRect.top - containerRect.top + scrollTop;
  let top = selectionTop - POPOVER_EST_HEIGHT - GAP_ABOVE_SELECTION;
  if (top < CONTAINER_PADDING) {
    top = CONTAINER_PADDING;
  }

  return { top, left };
}

const AddNotePopover = React.forwardRef<
  HTMLDivElement,
  {
    position: { top: number; left: number };
    newComment: string;
    onCommentChange: (value: string) => void;
    onAdd: () => void;
    onCancel: () => void;
  }
>(function AddNotePopover(
  { position, newComment, onCommentChange, onAdd, onCancel },
  ref
) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Add note to selection"
      className="absolute min-w-0 z-50"
      style={{
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH_COMPACT,
      }}
    >
      <div className="relative rounded-lg border border-border bg-card shadow-md p-2 space-y-2">
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border-r border-b border-border bg-card"
          aria-hidden
        />
        <Input
          placeholder="Add a note..."
          value={newComment}
          onChange={(e) => onCommentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
            if (e.key === "Escape") onCancel();
          }}
          className="text-sm h-8"
          autoFocus
        />
        <div className="flex gap-1.5 justify-end">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={onAdd}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
});

function generateAnnotationId() {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function DocumentPreview({
  document,
  isGenerating,
  outputType,
  onApprove,
  onRegenerate,
}: DocumentPreviewProps) {
  const [editedDocument, setEditedDocument] = useState(document);
  const [isApproving, setIsApproving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [annotationsOpen, setAnnotationsOpen] = useState(true);
  const [selectionQuote, setSelectionQuote] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newComment, setNewComment] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const addNoteFormRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Approve dialog state
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  // Compute popover position relative to preview container so it scrolls with the text
  React.useLayoutEffect(() => {
    if (!selectionRect || !previewContainerRef.current) {
      setPopoverPosition(null);
      return;
    }
    setPopoverPosition(getPopoverPositionInContainer(selectionRect, previewContainerRef.current));
  }, [selectionRect]);

  // Update edited document when generation completes
  React.useEffect(() => {
    if (document && !isGenerating) {
      setEditedDocument(document);
    }
  }, [document, isGenerating]);

  const openApproveDialog = () => {
    setShowApproveDialog(true);
  };

  const handleSaveFromModal = async (saveOptions: SaveOptions) => {
    setIsApproving(true);
    try {
      await onApprove(editedDocument, saveOptions);
      setShowApproveDialog(false);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedDocument);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([editedDocument], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${outputType}-${new Date().toISOString().split("T")[0]}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const captureSelectionFromPreview = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return { text: null, rect: null };
    const text = sel.toString().trim();
    if (!text) return { text: null, rect: null };
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    return { text, rect };
  }, []);

  const captureSelectionFromEdit = useCallback(() => {
    const ta = editTextareaRef.current;
    if (!ta) return null;
    const { selectionStart, selectionEnd, value } = ta;
    if (selectionStart === selectionEnd) return null;
    const text = value.slice(selectionStart, selectionEnd).trim();
    if (!text) return null;
    return text;
  }, []);

  const handlePreviewMouseUp = useCallback(() => {
    const { text, rect } = captureSelectionFromPreview();
    if (text) {
      setSelectionQuote(text);
      setSelectionRect(rect);
      setShowAddNoteForm(true);
      setNewComment("");
    }
  }, [captureSelectionFromPreview]);

  const handleEditSelection = useCallback(() => {
    const quote = captureSelectionFromEdit();
    if (quote) {
      setSelectionQuote(quote);
      setSelectionRect(null);
      setShowAddNoteForm(true);
      setNewComment("");
    }
  }, [captureSelectionFromEdit]);

  const addAnnotation = useCallback(() => {
    const quote = selectionQuote ?? newComment.slice(0, 80);
    if (!quote && !newComment.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: generateAnnotationId(),
        quote: quote || "(general note)",
        text: newComment.trim(),
        createdAt: Date.now(),
      },
    ]);
    setSelectionQuote(null);
    setSelectionRect(null);
    setPopoverPosition(null);
    setShowAddNoteForm(false);
    setNewComment("");
  }, [selectionQuote, newComment]);

  const cancelAddNote = useCallback(() => {
    setSelectionQuote(null);
    setSelectionRect(null);
    setPopoverPosition(null);
    setShowAddNoteForm(false);
    setNewComment("");
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAnnotationText = useCallback((id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, text } : a))
    );
  }, []);

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="p-4 rounded-full bg-primary/10"
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-1">
            Generating your {outputTypeLabels[outputType] || "document"}...
          </h3>
          <p className="text-sm text-muted-foreground">
            This may take a moment depending on the content size
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Processing content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              Generated {outputTypeLabels[outputType] || "Document"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Review and edit before approving for AI training
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {/* Preview / Edit Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")}>
        <TabsList className="grid w-full max-w-[200px] grid-cols-2">
          <TabsTrigger value="preview" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Edit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4 relative">
          <div
            ref={previewContainerRef}
            className={cn(
              "relative min-h-[400px] rounded-lg border border-border/60 bg-background p-6 overflow-y-auto",
              "prose prose-neutral dark:prose-invert max-w-none",
              "text-foreground [&_a]:text-primary [&_a]:underline"
            )}
            onMouseUp={handlePreviewMouseUp}
          >
            <MarkdownContent content={editedDocument} />
            {showAddNoteForm && selectionRect && popoverPosition && (
              <AddNotePopover
                ref={addNoteFormRef}
                position={popoverPosition}
                newComment={newComment}
                onCommentChange={setNewComment}
                onAdd={addAnnotation}
                onCancel={cancelAddNote}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Select text to add a note or change marker
          </p>
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <div className="relative">
            <Textarea
              ref={editTextareaRef}
              value={editedDocument}
              onChange={(e) => setEditedDocument(e.target.value)}
              className={cn(
                "min-h-[400px] font-mono text-sm resize-y",
                "bg-muted/30 border-border/60"
              )}
              placeholder="Generated document will appear here..."
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {editedDocument.length} characters
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            onClick={handleEditSelection}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Add note to selection
          </Button>
        </TabsContent>
      </Tabs>

      {/* Add note: inline form for Edit tab or general "Add note" (Preview popover is inside preview container above) */}
      {showAddNoteForm && !selectionRect ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {selectionQuote ? "Selected text" : "New note"}
          </p>
          {selectionQuote && (
            <blockquote className="text-sm text-muted-foreground border-l-2 border-primary/50 pl-3 py-1 truncate max-w-full">
              &quot;{selectionQuote.length > 120 ? `${selectionQuote.slice(0, 120)}…` : selectionQuote}&quot;
            </blockquote>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Your note or change..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAnnotation()}
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={addAnnotation}>
              Add note
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelAddNote}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {/* Annotations / Comments */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between gap-2 py-2 h-auto"
          onClick={() => setAnnotationsOpen((o) => !o)}
        >
          <span className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Notes & changes</span>
            {annotations.length > 0 && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                {annotations.length}
              </span>
            )}
          </span>
          {annotationsOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {annotationsOpen && (
          <div className="space-y-3 rounded-lg border border-border/40 bg-muted/10 p-4">
            {annotations.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  No notes yet. Select text in Preview or Edit, or add a general note below.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1.5"
                  onClick={() => setShowAddNoteForm(true)}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Add note
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {annotations.map((ann) => (
                  <li
                    key={ann.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background p-3"
                  >
                    <blockquote className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 truncate max-w-full">
                      &quot;{ann.quote.length > 80 ? `${ann.quote.slice(0, 80)}…` : ann.quote}&quot;
                    </blockquote>
                    <div className="flex gap-2 items-start">
                      <Input
                        value={ann.text}
                        onChange={(e) => updateAnnotationText(ann.id, e.target.value)}
                        placeholder="Note or change..."
                        className="flex-1 text-sm min-h-8"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeAnnotation(ann.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {annotations.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAddNoteForm(true)}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Add another note
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">
              What happens when you approve?
            </p>
            <p className="text-muted-foreground">
              The document will be added to your AI&apos;s knowledge base. Your AI Agent will use
              this content to provide better, more accurate responses to your users.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={onRegenerate}
          disabled={isApproving}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </Button>

        <Button
          onClick={openApproveDialog}
          disabled={isApproving || !editedDocument.trim()}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve & Train AI
        </Button>
      </div>

      {/* Approve Dialog - same Save to Storage modal as history approve */}
      <SaveToStorageModal
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        onSave={handleSaveFromModal}
        saving={isApproving}
        submitLabel="Save & Train AI"
      />
    </div>
  );
}
