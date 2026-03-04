"use client";

import { useEffect, useState } from "react";
import { Monitor, Loader2, Circle } from "lucide-react";

interface SignagePlayer {
  id: string;
  type: string;
  name: string;
  endpoint: string | null;
  status: string;
  last_seen_at: string | null;
}

export function SignageStatusWidget() {
  const [players, setPlayers] = useState<SignagePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/signage-status")
      .then((r) => r.ok ? r.json() : { players: [] })
      .then((d) => {
        setPlayers(d.players ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading signage…</span>
      </div>
    );
  }

  const online = players.filter((p) => p.status === "online").length;
  const offline = players.filter((p) => p.status === "offline").length;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Signage Status</h3>
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No screens registered.</p>
      ) : (
        <>
          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" /> {online} online
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-red-500 text-red-500" /> {offline} offline
            </span>
          </div>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate" title={p.endpoint ?? undefined}>
                  {p.name}
                </span>
                <span
                  className={[
                    "shrink-0 rounded px-1.5 py-0.5 text-xs",
                    p.status === "online" && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                    p.status === "offline" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
                    (p.status === "unknown" || p.status === "error") && "bg-muted text-muted-foreground",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
