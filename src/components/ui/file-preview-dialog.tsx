"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText, Download, Loader2, X, BrainCircuit,
  ExternalLink, Maximize2, FileImage, FileVideo2, FileAudio,
  FileCode2, FileSpreadsheet, Presentation, File, FileArchive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  filePath?: string;
  context?: "public" | "private";
  onAskAI?: () => void;
}

type PreviewType = "pdf" | "image" | "text" | "video" | "audio" | "office" | "code" | "other";

function classifyFile(name: string): PreviewType {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) return "audio";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"].includes(ext)) return "office";
  if (["js", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "sh", "bash", "css", "scss", "html", "xml", "yaml", "yml", "toml"].includes(ext)) return "code";
  if (["txt", "md", "json", "csv", "log", "env", "cfg", "ini", "rtf"].includes(ext)) return "text";
  return "other";
}

function getPreviewIcon(type: PreviewType) {
  switch (type) {
    case "pdf": return FileText;
    case "image": return FileImage;
    case "video": return FileVideo2;
    case "audio": return FileAudio;
    case "office": return FileSpreadsheet;
    case "code": return FileCode2;
    case "text": return FileText;
    default: return File;
  }
}

function getPreviewLabel(type: PreviewType): string {
  switch (type) {
    case "pdf": return "PDF Document";
    case "image": return "Image";
    case "video": return "Video";
    case "audio": return "Audio";
    case "office": return "Office Document";
    case "code": return "Source Code";
    case "text": return "Text File";
    default: return "File";
  }
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  fileName,
  filePath,
  context = "private",
  onAskAI,
}: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [collaboraUrl, setCollaboraUrl] = useState<string | null>(null);
  const [collaboraLoading, setCollaboraLoading] = useState(false);

  const previewType = classifyFile(fileName);
  const downloadPath = filePath || fileName;
  const downloadUrl = `/api/storage/download?scope=${context}&path=${encodeURIComponent(downloadPath)}`;
  const ext = fileName.split(".").pop()?.toUpperCase() || "";
  const PreviewIcon = getPreviewIcon(previewType);

  const cleanup = useCallback(() => {
    if (blobUrl?.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setTextContent(null);
    setCollaboraUrl(null);
    setError(null);
  }, [blobUrl]);

  useEffect(() => {
    if (!open || !fileName) return;
    cleanup();
    setLoading(true);

    const load = async () => {
      try {
        if (previewType === "office") {
          setCollaboraLoading(true);
          try {
            const res = await fetch(`/api/integrations/nextcloud/collabora-url?path=${encodeURIComponent(downloadPath)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.url) { setCollaboraUrl(data.url); setCollaboraLoading(false); setLoading(false); return; }
            }
          } catch { /* Collabora unavailable — fall through */ }
          setCollaboraLoading(false);
        }

        if (["pdf", "image"].includes(previewType)) {
          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error("Download failed");
          const blob = await res.blob();
          setBlobUrl(URL.createObjectURL(blob));
        } else if (["text", "code"].includes(previewType)) {
          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error("Download failed");
          setTextContent(await res.text());
        } else if (["video", "audio"].includes(previewType)) {
          setBlobUrl(downloadUrl);
        }
      } catch (e) {
        console.error("Preview load error:", e);
        setError("Could not load file preview.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => { if (blobUrl?.startsWith("blob:")) URL.revokeObjectURL(blobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fileName, downloadPath, previewType]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed inset-4 z-50 mx-auto my-auto max-w-6xl max-h-[90vh] rounded-2xl bg-background border border-border/50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-muted/20 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <PreviewIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{getPreviewLabel(previewType)} · {ext}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onAskAI && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { onAskAI(); onOpenChange(false); }}>
                    <BrainCircuit className="w-3.5 h-3.5" /> Ask AI
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                  <a href={downloadUrl} download>
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </Button>
                {collaboraUrl && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                    <a href={collaboraUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" /> Open in Collabora
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
                  <p className="text-sm text-muted-foreground">{collaboraLoading ? "Connecting to Collabora…" : "Loading preview…"}</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <div className="p-3 rounded-full bg-destructive/10"><X className="w-6 h-6 text-destructive" /></div>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={downloadUrl} download>Download instead</a>
                  </Button>
                </div>
              ) : collaboraUrl ? (
                <iframe src={collaboraUrl} className="w-full h-full border-0" title="Collabora Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              ) : previewType === "pdf" && blobUrl ? (
                <iframe src={`${blobUrl}#toolbar=1&navpanes=0`} className="w-full h-full border-0" title="PDF Preview" />
              ) : previewType === "image" && blobUrl ? (
                <div className="flex items-center justify-center h-full p-6 bg-[repeating-conic-gradient(#80808010_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
                  <img src={blobUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                </div>
              ) : previewType === "video" && blobUrl ? (
                <div className="flex items-center justify-center h-full p-6 bg-black">
                  <video src={blobUrl} controls className="max-w-full max-h-full rounded-lg" />
                </div>
              ) : previewType === "audio" && blobUrl ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-600/10 ring-1 ring-cyan-400/20">
                    <FileAudio className="w-16 h-16 text-cyan-500" />
                  </div>
                  <p className="text-lg font-semibold">{fileName}</p>
                  <audio src={blobUrl} controls className="w-full max-w-md" />
                </div>
              ) : (textContent !== null) ? (
                <div className="h-full overflow-auto p-6">
                  <pre className={cn(
                    "text-xs font-mono leading-relaxed whitespace-pre-wrap break-words p-5 rounded-xl",
                    "bg-muted/30 border border-border/40",
                    previewType === "code" ? "text-emerald-700 dark:text-emerald-300" : "text-foreground/80"
                  )}>
                    {textContent}
                  </pre>
                </div>
              ) : (
                <FallbackView fileName={fileName} ext={ext} previewType={previewType} downloadUrl={downloadUrl} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FallbackView({ fileName, ext, previewType, downloadUrl }: { fileName: string; ext: string; previewType: PreviewType; downloadUrl: string }) {
  const Icon = getPreviewIcon(previewType);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/20 ring-1 ring-border/30">
        <Icon className="w-16 h-16 text-muted-foreground/60" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{fileName}</p>
        <p className="text-sm text-muted-foreground">{getPreviewLabel(previewType)} · {ext} · No preview available</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <a href={downloadUrl} download><Download className="w-4 h-4 mr-2" /> Download</a>
        </Button>
      </div>
    </div>
  );
}
