"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeams } from "@/lib/hooks/useTeams";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { canPerform } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import TeamLogoDialog from "@/components/settings/TeamLogoDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  BarChart3,
  Mail,
  Copy,
  X,
  AlertCircle,
  Loader2,
  Check,
  Crown,
  Shield,
  Eye,
  User,
  MoreHorizontal,
  Building2,
  Calendar,
  Trash2,
  Cloud,
} from "lucide-react";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import Image from "next/image";

type Member = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
};

// Tab configuration
const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "members", label: "Members", icon: Users },
  { id: "invites", label: "Invites", icon: UserPlus },
  { id: "integrations", label: "Integrations", icon: Cloud },
] as const;

type TabId = (typeof tabs)[number]["id"];

// Role configuration with colors
const roleConfig = {
  owner: {
    icon: Crown,
    label: "Owner",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  admin: {
    icon: Shield,
    label: "Admin",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  member: {
    icon: User,
    label: "Member",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  viewer: {
    icon: Eye,
    label: "Viewer",
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
  },
};

export default function TeamPage() {
  const { currentTeam, refetch } = useTeams();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<Member["role"]>("member");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingInvites: 0,
    roleDistribution: { owner: 0, admin: 0, member: 0, viewer: 0 },
  });
  const supabase = createSupabaseBrowserClient();
  const canAdmin = currentTeam ? canPerform("admin", currentTeam.role) : false;

  const calculateAnalytics = (members: Member[], invites: Invite[]) => {
    const roleDistribution = members.reduce(
      (acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      },
      { owner: 0, admin: 0, member: 0, viewer: 0 } as Record<Member["role"], number>
    );

    return {
      totalMembers: members.length,
      activeMembers: members.length,
      pendingInvites: invites.length,
      roleDistribution,
    };
  };

  const fetchMembers = useCallback(async () => {
    if (!currentTeam) return;
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase.rpc("get_team_members", {
        p_team_id: currentTeam.id,
      });
      if (error) {
        setError(error.message);
        return;
      }
      const mapped: Member[] = ((data as any[] | null) || []).map((row: any) => ({
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        role: row.role,
        created_at: row.created_at,
      }));
      setMembers(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentTeam, supabase]);

  const fetchInvites = useCallback(async () => {
    if (!currentTeam) return;
    setIsLoadingInvites(true);
    try {
      const { data, error } = await supabase
        .from("invites")
        .select("id,email,role,created_at,accepted_at")
        .eq("team_id", currentTeam.id)
        .is("accepted_at", null);
      if (error) {
        setError(error.message);
        return;
      }
      const pending: Invite[] = (data || []).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        created_at: row.created_at,
      }));
      setInvites(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingInvites(false);
    }
  }, [currentTeam, supabase]);

  const invite = async () => {
    if (!inviteEmail || !currentTeam) return;
    setIsInviting(true);
    setError(null);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: currentTeam.id,
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      await fetchInvites();
      setTimeout(() => setInviteSuccess(null), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setInviteError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites/url?id=${encodeURIComponent(inviteId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get invite URL");
      await navigator.clipboard.writeText(data.inviteUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!currentTeam) return;
    try {
      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("id", inviteId)
        .eq("team_id", currentTeam.id);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const changeMemberRole = async (userId: string, newRole: Member["role"]) => {
    if (!currentTeam) return;
    const ownerCount = members.filter((m) => m.role === "owner").length;
    const target = members.find((m) => m.id === userId);
    if (target?.role === "owner" && newRole !== "owner" && ownerCount <= 1) {
      setError("Cannot change role of the last owner");
      return;
    }
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("team_id", currentTeam.id)
        .eq("user_id", userId);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const removeMember = async (userId: string) => {
    if (!currentTeam) return;
    const ownerCount = members.filter((m) => m.role === "owner").length;
    const target = members.find((m) => m.id === userId);
    if (target?.role === "owner" && ownerCount <= 1) {
      setError("Cannot remove the last owner");
      return;
    }
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", currentTeam.id)
        .eq("user_id", userId);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };


  const updateTeamLogo = async (file: File) => {
    if (!currentTeam) return;
    setIsUpdatingLogo(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${currentTeam.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("team-logos")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/png",
        });
      if (upErr) throw upErr;
      const { data: publicUrl } = supabase.storage.from("team-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("teams")
        .update({ logo_url: publicUrl.publicUrl })
        .eq("id", currentTeam.id);
      if (updErr) throw updErr;
      await refetch();
      setLogoPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdatingLogo(false);
    }
  };


  // Effects
  useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
      fetchMembers();
      fetchInvites();
    }
  }, [currentTeam, fetchMembers, fetchInvites]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentTeam) {
        fetchInvites();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentTeam, fetchInvites]);

  useEffect(() => {
    if (!currentTeam) return;
    const interval = setInterval(() => {
      fetchInvites();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentTeam, fetchInvites]);

  useEffect(() => {
    if (members.length > 0 || invites.length > 0) {
      const newAnalytics = calculateAnalytics(members, invites);
      setAnalytics(newAnalytics);
    }
  }, [members, invites]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    })();
  }, [supabase.auth]);

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Container - Scrollable */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative z-10">
        <div className="p-6 md:p-8 lg:p-10 flex flex-col min-h-0">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8 shrink-0"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Team Logo */}
              <div className="relative group">
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl overflow-hidden",
                    "bg-gradient-to-br from-primary/20 to-primary/5",
                    "border border-border/40 backdrop-blur-sm",
                    "flex items-center justify-center",
                    "shadow-lg shadow-primary/5",
                    "transition-all duration-500 ease-out",
                    "group-hover:shadow-xl group-hover:shadow-primary/10 group-hover:scale-105"
                  )}
                >
                  {logoPreview ? (
                    <Image src={logoPreview} alt="preview" fill className="object-cover" />
                  ) : currentTeam?.logo_url ? (
                    <Image
                      src={currentTeam.logo_url}
                      alt={currentTeam.name}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-primary/60" />
                  )}
                </div>
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  {currentTeam?.name || "Team"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs capitalize",
                      currentTeam?.role && roleConfig[currentTeam.role]?.borderColor,
                      currentTeam?.role && roleConfig[currentTeam.role]?.bgColor,
                      currentTeam?.role && roleConfig[currentTeam.role]?.color
                    )}
                  >
                    {currentTeam?.role}
                  </Badge>
                  {currentTeam?.created_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {new Date(currentTeam.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <QuickStat
                icon={Users}
                value={analytics.totalMembers}
                label="Members"
                color="blue"
              />
              <QuickStat
                icon={Mail}
                value={analytics.pendingInvites}
                label="Pending"
                color="amber"
              />
            </div>
          </div>
        </motion.header>

        {/* Tab Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 shrink-0"
        >
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30 w-fit">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.nav>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <TabContent key="overview">
                <OverviewTab
                  currentTeam={currentTeam}
                  analytics={analytics}
                  members={members}
                  canAdmin={canAdmin}
                  logoPreview={logoPreview}
                />
              </TabContent>
            )}

            {activeTab === "members" && (
              <TabContent key="members">
                <MembersTab
                  members={members}
                  isLoading={isLoadingMembers}
                  canAdmin={canAdmin}
                  currentUserId={currentUserId}
                  onChangeRole={changeMemberRole}
                  onRemove={removeMember}
                />
              </TabContent>
            )}

            {activeTab === "invites" && (
              <TabContent key="invites">
                <InvitesTab
                  invites={invites}
                  isLoading={isLoadingInvites}
                  canAdmin={canAdmin}
                  inviteEmail={inviteEmail}
                  setInviteEmail={setInviteEmail}
                  inviteRole={inviteRole}
                  setInviteRole={setInviteRole}
                  isInviting={isInviting}
                  inviteSuccess={inviteSuccess}
                  inviteError={inviteError}
                  setInviteSuccess={setInviteSuccess}
                  setInviteError={setInviteError}
                  onInvite={invite}
                  onCopyLink={copyInviteLink}
                  onRevoke={revokeInvite}
                />
              </TabContent>
            )}

            {activeTab === "integrations" && (
              <TabContent key="integrations">
                <IntegrationsTab canAdmin={canAdmin} />
              </TabContent>
            )}

          </AnimatePresence>
        </div>
        </div>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 backdrop-blur-xl shadow-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="p-1 rounded-full hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logo Dialog */}
        <TeamLogoDialog
          open={logoDialogOpen}
          onOpenChange={setLogoDialogOpen}
          onConfirm={async (file) => {
            setLogoPreview(URL.createObjectURL(file));
            await updateTeamLogo(file);
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function QuickStat({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: "blue" | "amber" | "emerald" | "purple";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm",
        colors[color]
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="font-semibold">{value}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}

function GlassCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl p-6",
        "bg-background/60 backdrop-blur-xl",
        "border border-border/30",
        hover && "transition-all duration-500 hover:border-border/50 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
      whileHover={hover ? { y: -2 } : undefined}
    >
      {children}
    </motion.div>
  );
}

// Overview Tab
function OverviewTab({
  currentTeam,
  analytics,
  members,
  canAdmin,
  logoPreview,
}: {
  currentTeam: any;
  analytics: any;
  members: Member[];
  canAdmin: boolean;
  logoPreview: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          value={analytics.totalMembers}
          label="Total Members"
          color="blue"
        />
        <StatCard
          icon={Check}
          value={analytics.activeMembers}
          label="Active"
          color="emerald"
        />
        <StatCard
          icon={Mail}
          value={analytics.pendingInvites}
          label="Pending Invites"
          color="amber"
        />
        <StatCard
          icon={BarChart3}
          value={Object.keys(analytics.roleDistribution).length}
          label="Role Types"
          color="purple"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Info */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Team Information</h3>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-muted/50 border border-border/30">
              {logoPreview ? (
                <Image src={logoPreview} alt="preview" fill className="object-cover" />
              ) : currentTeam?.logo_url ? (
                <Image
                  src={currentTeam.logo_url}
                  alt={currentTeam.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-lg font-medium text-foreground">{currentTeam?.name}</h4>
              <p className="text-sm text-muted-foreground">
                Created {currentTeam && new Date(currentTeam.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="h-px bg-border/30 my-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-2xl font-bold text-foreground">{analytics.totalMembers}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-2xl font-bold text-foreground">{analytics.pendingInvites}</p>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
            </div>
          </div>
        </GlassCard>

        {/* Role Distribution */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Role Distribution</h3>
          </div>

          <div className="space-y-4">
            {Object.entries(analytics.roleDistribution).map(([role, count]) => {
              const config = roleConfig[role as keyof typeof roleConfig];
              const Icon = config.icon;
              const percentage =
                analytics.totalMembers > 0
                  ? Math.round(((count as number) / analytics.totalMembers) * 100)
                  : 0;

              return (
                <div key={role} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <span className="text-sm font-medium text-foreground capitalize">
                        {role}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {count as number} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={cn("h-full rounded-full", config.bgColor.replace("/10", ""))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Recent Members */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recent Members</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {members.length} total
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3">
          {members.slice(0, 6).map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/20 border border-border/20"
            >
              <MemberAvatar name={member.full_name || member.email} src={member.avatar_url} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                  {member.full_name || member.email}
                </p>
                <RoleBadge role={member.role} />
              </div>
            </motion.div>
          ))}
          {members.length > 6 && (
            <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-muted/10 border border-border/10">
              <span className="text-sm text-muted-foreground">+{members.length - 6} more</span>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: "blue" | "amber" | "emerald" | "purple";
}) {
  const colors = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", glow: "group-hover:shadow-blue-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", glow: "group-hover:shadow-amber-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", glow: "group-hover:shadow-emerald-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-500", glow: "group-hover:shadow-purple-500/20" },
  };

  const colorConfig = colors[color];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "group relative p-4 rounded-2xl",
        "bg-background/60 backdrop-blur-xl",
        "border border-border/30",
        "transition-all duration-500",
        "hover:border-border/50 hover:shadow-xl",
        colorConfig.glow
      )}
    >
      <div className={cn("p-2 rounded-xl w-fit mb-3", colorConfig.bg)}>
        <Icon className={cn("w-5 h-5", colorConfig.text)} />
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}

// Members Tab
function MembersTab({
  members,
  isLoading,
  canAdmin,
  currentUserId,
  onChangeRole,
  onRemove,
}: {
  members: Member[];
  isLoading: boolean;
  canAdmin: boolean;
  currentUserId: string | null;
  onChangeRole: (userId: string, role: Member["role"]) => void;
  onRemove: (userId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <GlassCard hover={false}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Members Yet</h3>
          <p className="text-sm text-muted-foreground">Invite someone to get started!</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
            <p className="text-sm text-muted-foreground">Manage your team members and their roles</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {members.length} {members.length === 1 ? "member" : "members"}
        </Badge>
      </div>

      <div className="space-y-3">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl",
              "bg-muted/20 border border-border/20",
              "transition-all duration-300 hover:bg-muted/30 hover:border-border/30"
            )}
          >
            <MemberAvatar name={member.full_name || member.email} src={member.avatar_url} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {member.full_name || member.email}
                </span>
                <RoleBadge role={member.role} />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {member.email} • Joined {new Date(member.created_at).toLocaleDateString()}
              </p>
            </div>
            {canAdmin && (
              <MemberActions
                member={member}
                members={members}
                currentUserId={currentUserId}
                onChangeRole={onChangeRole}
                onRemove={onRemove}
              />
            )}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// Invites Tab
function InvitesTab({
  invites,
  isLoading,
  canAdmin,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isInviting,
  inviteSuccess,
  inviteError,
  setInviteSuccess,
  setInviteError,
  onInvite,
  onCopyLink,
  onRevoke,
}: {
  invites: Invite[];
  isLoading: boolean;
  canAdmin: boolean;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: Member["role"];
  setInviteRole: (role: Member["role"]) => void;
  isInviting: boolean;
  inviteSuccess: string | null;
  inviteError: string | null;
  setInviteSuccess: (msg: string | null) => void;
  setInviteError: (msg: string | null) => void;
  onInvite: () => void;
  onCopyLink: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  if (!canAdmin) {
    return (
      <GlassCard hover={false}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
            <Eye className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">View Only</h3>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to manage invites.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <GlassCard hover={false}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <UserPlus className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Invite New Member</h3>
            <p className="text-sm text-muted-foreground">Send an invitation to join your team</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {inviteSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{inviteSuccess}</span>
              <button onClick={() => setInviteSuccess(null)} className="ml-auto">
                <X className="w-3 h-3 text-emerald-500" />
              </button>
            </motion.div>
          )}
          {inviteError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
            >
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{inviteError}</span>
              <button onClick={() => setInviteError(null)} className="ml-auto">
                <X className="w-3 h-3 text-destructive" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                if (inviteError) setInviteError(null);
              }}
              placeholder="colleague@company.com"
              className="bg-muted/20 border-border/30"
              disabled={isInviting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Member["role"])}
              className="w-full h-10 px-3 rounded-lg bg-muted/20 border border-border/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isInviting}
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>

        <Button
          onClick={onInvite}
          disabled={!inviteEmail || isInviting}
          className="mt-4 w-full md:w-auto"
        >
          {isInviting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>
      </GlassCard>

      {/* Pending Invites */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Mail className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Pending Invites</h3>
              <p className="text-sm text-muted-foreground">Manage your pending team invitations</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {invites.length} pending
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-medium text-foreground mb-2">No Pending Invites</h4>
            <p className="text-sm text-muted-foreground">All invitations have been accepted.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite, index) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl",
                  "bg-muted/20 border border-border/20",
                  "transition-all duration-300 hover:bg-muted/30 hover:border-border/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={invite.role} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopyLink(invite.id)}
                    className="h-8 gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevoke(invite.id)}
                    className="h-8 gap-1.5 text-destructive hover:text-destructive hover:border-destructive/30"
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Revoke</span>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// Integrations Tab
function IntegrationsTab({ canAdmin }: { canAdmin: boolean }) {
  if (!canAdmin) {
    return (
      <GlassCard hover={false}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
            <Cloud className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">View Only</h3>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to manage integrations.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Cloud className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Integrations</h3>
            <p className="text-sm text-muted-foreground">
              Connect external services to sync files and data
            </p>
          </div>
        </div>
        <div className="-mx-1">
          <IntegrationsPanel />
        </div>
      </GlassCard>
    </div>
  );
}


// Helper Components
function MemberAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src: string | null | undefined;
  className?: string;
}) {
  const initials = getInitials(name);
  const gradient = pickGradient(name);

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full overflow-hidden ring-2 ring-background",
        className
      )}
    >
      {src ? (
        <Image src={src} alt={name} width={40} height={40} className="w-full h-full object-cover" />
      ) : (
        <div className={cn("w-full h-full grid place-items-center text-xs font-semibold text-white", gradient)}>
          {initials}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: Member["role"] }) {
  const config = roleConfig[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium capitalize",
        config.bgColor,
        config.borderColor,
        config.color,
        "border"
      )}
    >
      {role}
    </span>
  );
}

function MemberActions({
  member,
  members,
  currentUserId,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  members: Member[];
  currentUserId: string | null;
  onChangeRole: (userId: string, role: Member["role"]) => void;
  onRemove: (userId: string) => void;
}) {
  const roles: Member["role"][] = ["owner", "admin", "member", "viewer"];
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const isLastOwner = member.role === "owner" && ownerCount <= 1;
  const isSelf = currentUserId === member.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((r) => {
          const isSameRole = r === member.role;
          const wouldDemoteOwner = member.role === "owner" && r !== "owner";
          const disabled = isSameRole || (wouldDemoteOwner && isLastOwner) || (isSelf && isLastOwner && r !== "owner");
          const config = roleConfig[r];
          const Icon = config.icon;

          return (
            <DropdownMenuItem
              key={r}
              disabled={disabled}
              onClick={() => !disabled && onChangeRole(member.id, r)}
              className={cn(isSameRole && "bg-muted/50")}
            >
              <Icon className={cn("w-4 h-4 mr-2", config.color)} />
              <span className="capitalize">{r}</span>
              {isSameRole && <Check className="w-3 h-3 ml-auto text-muted-foreground" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onRemove(member.id)}
          disabled={isLastOwner || (isSelf && isLastOwner)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remove Member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Utility functions
function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function pickGradient(seed: string) {
  const gradients = [
    "bg-gradient-to-br from-indigo-500 to-purple-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-amber-500 to-orange-500",
    "bg-gradient-to-br from-sky-500 to-cyan-500",
    "bg-gradient-to-br from-rose-500 to-pink-500",
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-blue-500 to-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}
