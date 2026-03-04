"use client";
import { useState, useMemo, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteTeamDangerZone() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [teamId, setTeamId] = useState<string>("");
  const [role, setRole] = useState<"owner" | "admin" | "member" | "viewer" | null>(null);
  const [confirmName, setConfirmName] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("team_id="));
    const id = cookie?.split("=")[1] ?? "";
    setTeamId(id);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!teamId) return;
      // Fetch my role for this team
      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes.user;
      if (!me) return;
      const { data: member } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", me.id)
        .maybeSingle();
      setRole((member?.role as any) ?? null);
      const { data: t } = await supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .maybeSingle();
      setTeamName(t?.name ?? "");
    };
    run();
  }, [supabase, teamId]);

  const handleDelete = async () => {
    if (!teamId || role !== "owner") return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/teams/delete", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      // After deletion, determine next team or onboarding
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return router.replace("/signin");

      const { data: memberships } = await supabase
        .from("team_members")
        .select("teams(id,name,created_at,logo_url), role")
        .eq("user_id", userId);

      const remaining = (memberships || []).map((m: any) => ({
        id: m.teams.id as string,
        name: m.teams.name as string,
        created_at: m.teams.created_at as string,
        role: m.role as "owner" | "admin" | "member" | "viewer",
        logo_url: m.teams.logo_url as string | null,
      }));

      if (remaining.length > 0) {
        const next = remaining[0];
        document.cookie = `team_id=${encodeURIComponent(next.id)}; path=/`;
        router.replace("/dashboard");
      } else {
        // Clear cookie and force onboarding to create a new team
        document.cookie = `team_id=; path=/; max-age=0`;
        router.replace("/dashboard/onboarding");
      }
    } catch (e: any) {
      setError(e.message || "Failed to delete team");
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = role !== "owner" || confirmName.trim() !== teamName.trim();

  return (
    <div className="border border-destructive/30 bg-destructive/5 rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="text-base font-semibold text-destructive">Danger zone</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Delete this team and all of its data. This action cannot be undone.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Type the team name to confirm</label>
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={teamName || "Team name"}
          className="w-full px-3 py-2 rounded-lg bg-background/60 backdrop-blur-sm text-foreground placeholder:text-muted-foreground border"
        />
      </div>
      {error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          You must be the owner to delete this team.
        </div>
        <Button
          variant="destructive"
          disabled={disabled || submitting}
          onClick={handleDelete}
        >
          {submitting ? "Deleting…" : "Delete team"}
        </Button>
      </div>
    </div>
  );
}


