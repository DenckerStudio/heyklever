"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Users, Building2, CreditCard, Activity, Loader2,
  ShieldAlert, Crown, Shield, UserCircle, Eye,
  Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

interface TeamData {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  created_at: string;
  logo_url: string | null;
  memberCount: number;
  subscription: { status: string; id: string } | null;
}

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  teams: { teamId: string; teamName: string; role: string }[];
}

interface PlatformStats {
  totalTeams: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
}

type Tab = "teams" | "users" | "subscriptions";

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: UserCircle,
  viewer: Eye,
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tab, setTab] = useState<Tab>("teams");
  const [search, setSearch] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/platform")
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Access denied" : "Failed to load");
        return res.json();
      })
      .then((data) => {
        setTeams(data.teams || []);
        setUsers(data.users || []);
        setStats(data.stats || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <ShieldAlert className="w-12 h-12 text-destructive/50" />
        <h2 className="text-xl font-semibold">Admin Access Required</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { id: "teams", label: "Teams", icon: Building2, count: stats?.totalTeams || 0 },
    { id: "users", label: "Users", icon: Users, count: stats?.totalUsers || 0 },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard, count: stats?.activeSubscriptions || 0 },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              <ShieldAlert className="w-3 h-3" /> Platform Admin
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Manage teams, users, and subscriptions across the platform.</p>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Teams" value={stats.totalTeams} icon={Building2} />
            <StatCard label="Users" value={stats.totalUsers} icon={Users} />
            <StatCard label="Active Subs" value={stats.activeSubscriptions} icon={CreditCard} color="text-emerald-500" />
            <StatCard label="Total Subs" value={stats.totalSubscriptions} icon={Activity} />
          </motion.div>
        )}

        {/* Tabs + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                    tab === t.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className="text-[10px] opacity-70">({t.count})</span>
                </button>
              );
            })}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        {tab === "teams" && (
          <div className="space-y-2">
            {filteredTeams.map((team) => (
              <TeamRow
                key={team.id}
                team={team}
                users={users}
                expanded={expandedTeam === team.id}
                onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
              />
            ))}
            {filteredTeams.length === 0 && <Empty text="No teams found" />}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
            {filteredUsers.length === 0 && <Empty text="No users found" />}
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="space-y-2">
            {teams
              .filter((t) => t.subscription)
              .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
              .map((team) => (
                <SubscriptionRow key={team.id} team={team} />
              ))}
            {teams.filter((t) => t.subscription).length === 0 && <Empty text="No subscriptions" />}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted/50">
        <Icon className={cn("w-4 h-4", color || "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TeamRow({ team, users, expanded, onToggle }: { team: TeamData; users: UserData[]; expanded: boolean; onToggle: () => void }) {
  const teamUsers = users.filter((u) => u.teams.some((t) => t.teamId === team.id));
  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
          {team.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{team.name}</span>
            {team.name === "HeyKlever" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">ADMIN</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span className="capitalize">{team.plan || "free"}</span>
            <span>·</span>
            <SubBadge status={team.subscription?.status} />
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && teamUsers.length > 0 && (
        <div className="border-t border-border/30 px-4 py-3 space-y-2 bg-muted/10">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Members</p>
          {teamUsers.map((u) => {
            const membership = u.teams.find((t) => t.teamId === team.id);
            const role = (membership?.role || "member") as Role;
            const RoleIcon = ROLE_ICONS[role] || UserCircle;
            return (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <RoleIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{u.full_name || u.email}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  {ROLE_LABELS[role] || role}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: UserData }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
        {(user.full_name || user.email).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{user.full_name || "—"}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {user.teams.map((t) => {
          const role = t.role as Role;
          const RoleIcon = ROLE_ICONS[role] || UserCircle;
          return (
            <span key={t.teamId} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-muted border border-border/40 text-muted-foreground">
              <RoleIcon className="w-2.5 h-2.5" />
              {t.teamName}
            </span>
          );
        })}
        {user.teams.length === 0 && <span className="text-[10px] text-muted-foreground italic">No teams</span>}
      </div>
    </div>
  );
}

function SubscriptionRow({ team }: { team: TeamData }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
        {team.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{team.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{team.plan || "free"} plan</p>
      </div>
      <SubBadge status={team.subscription?.status} />
    </div>
  );
}

function SubBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">No sub</span>;
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    trialing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    canceled: "bg-red-500/10 text-red-500 border-red-500/20",
    past_due: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize", colors[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-12 text-sm text-muted-foreground">{text}</div>;
}
