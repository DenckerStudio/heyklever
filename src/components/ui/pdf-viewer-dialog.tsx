"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText, Download, ShieldCheck, ShieldAlert, Loader2, X,
  FileImage, FileSpreadsheet, FileCode2, File, ExternalLink, Tag,
} from "lucide-react";
import {
  Modal,
  ModalBody,
} from "@/components/ui/animated-modal";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  context?: 'public' | 'private';
  excerpts?: string[];
  relevance?: string;
}

type FileType = 'pdf' | 'image' | 'text' | 'office' | 'other';

function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['txt', 'md', 'json', 'csv', 'log', 'xml', 'yaml', 'yml', 'html', 'htm'].includes(ext)) return 'text';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) return 'office';
  return 'other';
}

function getPreviewIcon(type: FileType) {
  switch (type) {
    case 'pdf': return FileText;
    case 'image': return FileImage;
    case 'office': return FileSpreadsheet;
    case 'text': return FileCode2;
    default: return File;
  }
}

function getPreviewLabel(type: FileType): string {
  switch (type) {
    case 'pdf': return 'PDF Document';
    case 'image': return 'Image';
    case 'office': return 'Office Document';
    case 'text': return 'Text File';
    default: return 'File';
  }
}

export function PDFViewerDialog({ open, onOpenChange, fileName, context = 'private', excerpts = [], relevance }: DocumentViewerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [collaboraUrl, setCollaboraUrl] = useState<string | null>(null);
  const [collaboraLoading, setCollaboraLoading] = useState(false);

  const fileType = getFileType(fileName);
  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  const downloadUrl = `/api/storage/download?scope=${context}&path=${encodeURIComponent(fileName)}`;
  const PreviewIcon = getPreviewIcon(fileType);

  const cleanup = useCallback(() => {
    if (fileUrl?.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
    setTextContent(null);
    setCollaboraUrl(null);
    setError(null);
  }, [fileUrl]);

  useEffect(() => {
    if (!open || !fileName) return;
    cleanup();
    setLoading(true);

    const load = async () => {
      try {
        if (fileType === 'office') {
          setCollaboraLoading(true);
          try {
            const res = await fetch(`/api/integrations/nextcloud/collabora-url?path=${encodeURIComponent(fileName)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.url) {
                setCollaboraUrl(data.url);
                setCollaboraLoading(false);
                setLoading(false);
                return;
              }
            }
          } catch { /* Collabora unavailable */ }
          setCollaboraLoading(false);
        }

        if (['pdf', 'image'].includes(fileType)) {
          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error('Download failed');
          const blob = await res.blob();
          setFileUrl(URL.createObjectURL(blob));
        } else if (fileType === 'text') {
          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error('Download failed');
          setTextContent(await res.text());
          setFileUrl('text-loaded');
        }
      } catch (e) {
        console.error('Preview load error:', e);
        setError('Could not load file preview.');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      if (fileUrl?.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fileName, context, fileType]);

  return (
    <Modal open={open} setOpen={onOpenChange}>
      <ModalBody className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] md:max-w-5xl md:rounded-2xl overflow-hidden p-0 flex flex-col bg-background border border-border/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <PreviewIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{fileName}</p>
              <p className="text-[11px] text-muted-foreground">{getPreviewLabel(fileType)} · {ext}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {relevance && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
                relevance === 'high' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                relevance === 'medium' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                relevance === 'low' && "bg-red-500/10 text-red-600 dark:text-red-400",
              )}>
                <Tag className="w-3 h-3" />
                {relevance}
              </div>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <a href={downloadUrl} download>
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </Button>
            {collaboraUrl && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                <a href={collaboraUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Editor
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/5">
          {loading || collaboraLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">
                {collaboraLoading ? 'Connecting to Collabora…' : 'Loading preview…'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className="p-3 rounded-full bg-destructive/10">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" asChild>
                <a href={downloadUrl} download>Download instead</a>
              </Button>
            </div>
          ) : collaboraUrl ? (
            <iframe
              src={collaboraUrl}
              className="w-full h-full border-0"
              title="Collabora Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : fileType === 'pdf' && fileUrl ? (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : fileType === 'image' && fileUrl ? (
            <div className="flex items-center justify-center h-full p-6 bg-[repeating-conic-gradient(#80808010_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
              <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : textContent !== null ? (
            <div className="flex flex-col md:flex-row h-full">
              <div className="flex-1 overflow-auto p-6">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words p-5 rounded-xl bg-muted/30 border border-border/40 text-foreground/80">
                  {textContent}
                </pre>
              </div>
              {excerpts.length > 0 && (
                <div className="w-full md:w-80 border-l border-border/40 p-6 overflow-y-auto bg-muted/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Relevant Excerpts</h4>
                  <div className="space-y-3">
                    {excerpts.map((excerpt, i) => (
                      <div key={i} className="p-3 bg-primary/5 rounded-lg text-sm leading-relaxed border border-primary/10">
                        &ldquo;{excerpt}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <FallbackContent
              fileName={fileName}
              fileType={fileType}
              ext={ext}
              downloadUrl={downloadUrl}
              excerpts={excerpts}
              relevance={relevance}
            />
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

function FallbackContent({
  fileName, fileType, ext, downloadUrl, excerpts, relevance,
}: {
  fileName: string; fileType: FileType; ext: string; downloadUrl: string;
  excerpts: string[]; relevance?: string;
}) {
  const Icon = getPreviewIcon(fileType);
  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
          <Icon className="w-16 h-16 text-primary/60" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">{fileName}</p>
          <p className="text-sm text-muted-foreground">{getPreviewLabel(fileType)} · {ext}</p>
        </div>
        {relevance && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/30">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Relevance: {relevance}</span>
          </div>
        )}
        <Button variant="outline" asChild>
          <a href={downloadUrl} download>
            <Download className="w-4 h-4 mr-2" /> Download File
          </a>
        </Button>
      </div>
      {excerpts.length > 0 && (
        <div className="w-full md:w-80 border-l border-border/40 p-6 overflow-y-auto bg-muted/10">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Relevant Excerpts</h4>
          <div className="space-y-3">
            {excerpts.map((excerpt, i) => (
              <div key={i} className="p-3 bg-primary/5 rounded-lg text-sm leading-relaxed border border-primary/10">
                &ldquo;{excerpt}&rdquo;
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
