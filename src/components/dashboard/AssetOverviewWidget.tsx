"use client";

import { useEffect, useState } from "react";
import { Package, Users, FileCheck, AlertTriangle, Loader2 } from "lucide-react";

interface SnipeOverview {
  configured: boolean;
  summary?: {
    hardwareTotal: number;
    usersCount: number;
    licensesCount: number;
    lowLicensesCount: number;
  };
  hardware?: unknown[];
  activity?: unknown[];
}

export function AssetOverviewWidget() {
  const [data, setData] = useState<SnipeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/snipe-it/overview")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading assets…</span>
      </div>
    );
  }

  if (!data?.configured || !data.summary) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Asset Overview</h3>
        </div>
        <p className="text-sm text-muted-foreground">Connect Snipe-IT in team settings to see assets.</p>
      </div>
    );
  }

  const s = data.summary;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Asset Overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
          <Package className="h-4 w-4 shrink-0" />
          <span>{s.hardwareTotal} hardware</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
          <Users className="h-4 w-4 shrink-0" />
          <span>{s.usersCount} users</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
          <FileCheck className="h-4 w-4 shrink-0" />
          <span>{s.licensesCount} licenses</span>
        </div>
        {s.lowLicensesCount > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-amber-100 dark:bg-amber-900/30 col-span-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{s.lowLicensesCount} license(s) low on seats</span>
          </div>
        )}
      </div>
    </div>
  );
}
