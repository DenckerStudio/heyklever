"use client";

import { useEffect, useState } from "react";
import { FileText, Cloud, Loader2 } from "lucide-react";

interface DocumentPulseFile {
  file_id: string;
  file_name: string;
  chunks: number;
  last_indexed_at: string;
}

interface DocumentPulseData {
  recentFiles: DocumentPulseFile[];
  totalChunks: number;
}

interface NextcloudFile {
  name: string;
  path: string;
  size: number;
  lastModified: string;
}

export function DocumentPulseWidget() {
  const [pulse, setPulse] = useState<DocumentPulseData | null>(null);
  const [nextcloudFiles, setNextcloudFiles] = useState<NextcloudFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextcloudConfigured, setNextcloudConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pulseRes, ncRes] = await Promise.all([
          fetch("/api/dashboard/document-pulse"),
          fetch("/api/integrations/nextcloud/files"),
        ]);
        if (cancelled) return;
        if (pulseRes.ok) {
          const data = await pulseRes.json();
          setPulse(data);
        }
        if (ncRes.ok) {
          const nc = await ncRes.json();
          setNextcloudFiles(nc.files ?? []);
          setNextcloudConfigured(nc.configured === true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading document pulse…</span>
      </div>
    );
  }

  const recent = pulse?.recentFiles ?? [];
  const ncList = nextcloudFiles ?? [];
  const hasAny = recent.length > 0 || ncList.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Document Pulse</h3>
        {nextcloudConfigured && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Cloud className="h-3 w-3" /> Nextcloud
          </span>
        )}
      </div>
      {!hasAny ? (
        <p className="text-sm text-muted-foreground">No documents indexed yet.</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {recent.slice(0, 8).map((f) => (
            <li key={f.file_id} className="flex items-center justify-between text-sm gap-2">
              <span className="truncate" title={f.file_name}>
                {f.file_name}
              </span>
              <span className="text-muted-foreground shrink-0">
                {f.chunks} chunk{f.chunks !== 1 ? "s" : ""}
              </span>
            </li>
          ))}
          {nextcloudConfigured && ncList.slice(0, 5).map((f) => (
            <li key={f.path} className="flex items-center justify-between text-sm gap-2 text-muted-foreground">
              <span className="truncate flex items-center gap-1">
                <Cloud className="h-3 w-3 shrink-0" /> {f.name}
              </span>
              <span className="shrink-0">{f.size ? `${(f.size / 1024).toFixed(1)} KB` : "—"}</span>
            </li>
          ))}
        </ul>
      )}
      {pulse && pulse.totalChunks > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {pulse.totalChunks} total chunks in knowledge base
        </p>
      )}
    </div>
  );
}
