"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, normalizeFileName } from "@/lib/utils";
import {
  Upload,
  Link2,
  Map,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { useDropzone } from "react-dropzone";

interface DataIngestionPanelProps {
  teamId: string;
  onSuccess?: () => void;
  className?: string;
}

type IngestionStatus = "idle" | "loading" | "success" | "error";

interface UrlItem {
  id: string;
  url: string;
  status: IngestionStatus;
  error?: string;
}

// File Upload Tab Component
function FileUploadTab({
  teamId,
  onSuccess,
}: {
  teamId: string;
  onSuccess?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, IngestionStatus>>({});

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    const newStatus: Record<string, IngestionStatus> = {};
    
    for (const file of files) {
      newStatus[file.name] = "loading";
      setUploadStatus({ ...newStatus });
      
      try {
        const normalizedFileName = normalizeFileName(file.name);
        
        // Get signed upload URL
        const response = await fetch('/api/storage/upload/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileSize: file.size,
            contentType: file.type,
            scope: 'private',
          }),
        });

        if (!response.ok) throw new Error('Failed to get upload URL');

        const { uploadUrl, token, path: objectPath, bucketId } = await response.json();

        // Upload file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
            'Authorization': `Bearer ${token}`,
          },
          body: file,
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');

        // Trigger ingestion
        if (objectPath && bucketId) {
          const lower = file.name.toLowerCase();
          let content = '';
          
          if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || 
              lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.html')) {
            try {
              content = await file.text();
            } catch {
              content = '';
            }
          }
          
          await fetch('/api/storage/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              context: 'private',
              bucketId,
              objectPath,
              fileName: normalizedFileName,
              content,
            }),
          });
        }

        newStatus[file.name] = "success";
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        newStatus[file.name] = "error";
      }
      
      setUploadStatus({ ...newStatus });
    }
    
    setUploading(false);
    
    // Clear files after all uploads complete
    setTimeout(() => {
      setFiles([]);
      setUploadStatus({});
      onSuccess?.();
    }, 2000);
  }, [files, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(prev => [...prev, ...acceptedFiles]);
    },
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer",
          "flex flex-col items-center justify-center text-center",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        <div className="p-3 rounded-full bg-primary/10 mb-3">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? "Drop files here" : "Drag & drop files"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {uploadStatus[file.name] === "loading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {uploadStatus[file.name] === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  {uploadStatus[file.name] === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {!uploading && !uploadStatus[file.name] && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {files.length} file{files.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Website/Link Tab Component
function WebsiteLinkTab({
  teamId,
  onSuccess,
}: {
  teamId: string;
  onSuccess?: () => void;
}) {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [inputUrl, setInputUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [processing, setProcessing] = useState(false);

  const addUrl = () => {
    if (!inputUrl.trim()) return;
    
    try {
      new URL(inputUrl.trim());
      setUrls(prev => [
        ...prev,
        { id: crypto.randomUUID(), url: inputUrl.trim(), status: "idle" }
      ]);
      setInputUrl("");
    } catch {
      // Invalid URL
    }
  };

  const addBulkUrls = () => {
    const lines = bulkUrls.split('\n').filter(line => line.trim());
    const validUrls: UrlItem[] = [];
    
    for (const line of lines) {
      try {
        new URL(line.trim());
        validUrls.push({
          id: crypto.randomUUID(),
          url: line.trim(),
          status: "idle"
        });
      } catch {
        // Skip invalid URLs
      }
    }
    
    setUrls(prev => [...prev, ...validUrls]);
    setBulkUrls("");
    setMode("single");
  };

  const removeUrl = (id: string) => {
    setUrls(prev => prev.filter(u => u.id !== id));
  };

  const processUrls = async () => {
    if (urls.length === 0) return;
    
    setProcessing(true);
    
    for (const item of urls) {
      setUrls(prev =>
        prev.map(u =>
          u.id === item.id ? { ...u, status: "loading" } : u
        )
      );
      
      try {
        const response = await fetch('/api/rag/ingest/website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            url: item.url,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to process URL');
        
        setUrls(prev =>
          prev.map(u =>
            u.id === item.id ? { ...u, status: "success" } : u
          )
        );
      } catch (error) {
        setUrls(prev =>
          prev.map(u =>
            u.id === item.id
              ? { ...u, status: "error", error: "Failed to process" }
              : u
          )
        );
      }
    }
    
    setProcessing(false);
    
    // Clear successful URLs after delay
    setTimeout(() => {
      setUrls(prev => prev.filter(u => u.status !== "success"));
      onSuccess?.();
    }, 2000);
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={mode === "single" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("single")}
        >
          Single URL
        </Button>
        <Button
          variant={mode === "bulk" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("bulk")}
        >
          Bulk Import
        </Button>
      </div>

      {mode === "single" ? (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/page"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
            className="flex-1"
          />
          <Button onClick={addUrl} disabled={!inputUrl.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Paste URLs here, one per line..."
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <Button onClick={addBulkUrls} disabled={!bulkUrls.trim()}>
            Add URLs
          </Button>
        </div>
      )}

      {/* URL list */}
      {urls.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {urls.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{item.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "loading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {item.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {!processing && item.status === "idle" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeUrl(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Process button */}
      {urls.length > 0 && urls.some(u => u.status === "idle") && (
        <Button
          onClick={processUrls}
          disabled={processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-2" />
              Process {urls.filter(u => u.status === "idle").length} URL{urls.filter(u => u.status === "idle").length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Sitemap Tab Component
function SitemapTab({
  teamId,
  onSuccess,
}: {
  teamId: string;
  onSuccess?: () => void;
}) {
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseSitemap = async () => {
    if (!sitemapUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/rag/ingest/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitemapUrl: sitemapUrl.trim(),
          parseOnly: true,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to parse sitemap');
      
      const data = await response.json();
      setParsedUrls(data.urls || []);
      setSelectedUrls(new Set(data.urls || []));
    } catch (err) {
      setError("Failed to parse sitemap. Make sure the URL is valid and accessible.");
    } finally {
      setLoading(false);
    }
  };

  const toggleUrl = (url: string) => {
    setSelectedUrls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedUrls(new Set(parsedUrls));
  };

  const deselectAll = () => {
    setSelectedUrls(new Set());
  };

  const processSelected = async () => {
    if (selectedUrls.size === 0) return;
    
    setProcessing(true);
    
    try {
      const response = await fetch('/api/rag/ingest/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          sitemapUrl: sitemapUrl.trim(),
          selectedUrls: Array.from(selectedUrls),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to process sitemap URLs');
      
      // Reset after success
      setParsedUrls([]);
      setSelectedUrls(new Set());
      setSitemapUrl("");
      onSuccess?.();
    } catch (err) {
      setError("Failed to process selected URLs");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sitemap URL input */}
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/sitemap.xml"
          value={sitemapUrl}
          onChange={(e) => setSitemapUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && parseSitemap()}
          className="flex-1"
        />
        <Button onClick={parseSitemap} disabled={loading || !sitemapUrl.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Map className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Parsed URLs */}
      {parsedUrls.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {parsedUrls.length} URLs
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 border border-border/40 rounded-lg p-2">
            {parsedUrls.map((url) => (
              <label
                key={url}
                className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUrls.has(url)}
                  onChange={() => toggleUrl(url)}
                  className="rounded border-border"
                />
                <span className="text-sm truncate flex-1">{url}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </label>
            ))}
          </div>

          <Button
            onClick={processSelected}
            disabled={processing || selectedUrls.size === 0}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Map className="h-4 w-4 mr-2" />
                Index {selectedUrls.size} page{selectedUrls.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {parsedUrls.length === 0 && !loading && (
        <div className="text-center py-6 text-muted-foreground">
          <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Enter a sitemap URL to discover pages</p>
        </div>
      )}
    </div>
  );
}

// Main Data Ingestion Panel Component
export function DataIngestionPanel({
  teamId,
  onSuccess,
  className,
}: DataIngestionPanelProps) {
  return (
    <div className={cn("w-full", className)}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="files" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Files</span>
          </TabsTrigger>
          <TabsTrigger value="websites" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Websites</span>
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="gap-1.5">
            <Map className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sitemap</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-0">
          <FileUploadTab teamId={teamId} onSuccess={onSuccess} />
        </TabsContent>

        <TabsContent value="websites" className="mt-0">
          <WebsiteLinkTab teamId={teamId} onSuccess={onSuccess} />
        </TabsContent>

        <TabsContent value="sitemap" className="mt-0">
          <SitemapTab teamId={teamId} onSuccess={onSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
