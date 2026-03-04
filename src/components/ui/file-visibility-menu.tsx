"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Lock, ShieldCheck, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type VisibilityScope = "internal" | "public" | "restricted";

interface ClientUrl {
  display_code: string;
  name: string;
}

interface FileVisibilityMenuProps {
  fileName: string;
  onChanged?: () => void;
  className?: string;
}

const SCOPES: { value: VisibilityScope; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "internal", label: "Internal", description: "Team only", icon: Lock },
  { value: "public", label: "Public", description: "All client pages", icon: Globe },
  { value: "restricted", label: "Restricted", description: "Specific client pages", icon: ShieldCheck },
];

export function FileVisibilityMenu({ fileName, onChanged, className }: FileVisibilityMenuProps) {
  const [scope, setScope] = useState<VisibilityScope>("internal");
  const [allowedCodes, setAllowedCodes] = useState<string[]>([]);
  const [clientUrls, setClientUrls] = useState<ClientUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fileName) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/storage/visibility?fileName=${encodeURIComponent(fileName)}`).then((r) => r.json()),
      fetch("/api/teams/client-urls").then((r) => r.json()),
    ])
      .then(([vis, urls]) => {
        setScope(vis.visibilityScope || "internal");
        setAllowedCodes(vis.allowedClientCodes || []);
        setClientUrls(
          (urls.clientUrls || []).map((u: { display_code: string; name: string }) => ({
            display_code: u.display_code,
            name: u.name,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fileName]);

  const save = useCallback(
    async (newScope: VisibilityScope, newCodes: string[]) => {
      setSaving(true);
      try {
        await fetch("/api/storage/visibility", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName,
            visibilityScope: newScope,
            allowedClientCodes: newScope === "restricted" ? newCodes : undefined,
          }),
        });
        onChanged?.();
      } catch (e) {
        console.error("Failed to update visibility:", e);
      } finally {
        setSaving(false);
      }
    },
    [fileName, onChanged]
  );

  const handleScopeChange = (newScope: VisibilityScope) => {
    setScope(newScope);
    if (newScope !== "restricted") {
      save(newScope, []);
    }
  };

  const toggleClientCode = (code: string) => {
    const next = allowedCodes.includes(code)
      ? allowedCodes.filter((c) => c !== code)
      : [...allowedCodes, code];
    setAllowedCodes(next);
    save("restricted", next);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 p-3 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 p-3 min-w-[240px]", className)}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Access Level
      </div>

      <div className="space-y-1">
        {SCOPES.map((s) => {
          const Icon = s.icon;
          const active = scope === s.value;
          return (
            <button
              key={s.value}
              onClick={() => handleScopeChange(s.value)}
              disabled={saving}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm",
                active
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{s.label}</span>
                <span className="block text-[11px] text-muted-foreground">{s.description}</span>
              </div>
              {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      {scope === "restricted" && clientUrls.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Client Pages
          </div>
          {clientUrls.map((url) => {
            const checked = allowedCodes.includes(url.display_code);
            return (
              <button
                key={url.display_code}
                onClick={() => toggleClientCode(url.display_code)}
                disabled={saving}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-left transition-all",
                  checked ? "bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                  checked ? "bg-primary border-primary" : "border-border"
                )}>
                  {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                <span className="truncate">{url.name || url.display_code}</span>
              </button>
            );
          })}
          {clientUrls.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-1">No client pages configured</p>
          )}
        </div>
      )}

      {saving && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </div>
      )}
    </div>
  );
}

export function VisibilityBadge({ scope }: { scope?: string }) {
  if (!scope || scope === "internal") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/20">
        <Lock className="w-2.5 h-2.5" /> Internal
      </span>
    );
  }
  if (scope === "public") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <Globe className="w-2.5 h-2.5" /> Public
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
      <ShieldCheck className="w-2.5 h-2.5" /> Restricted
    </span>
  );
}
