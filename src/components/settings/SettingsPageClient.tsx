"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeams } from "@/lib/hooks/useTeams";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { canPerform } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TeamLogoDialog from "@/components/settings/TeamLogoDialog";
import { ClientUrlManager } from "@/components/settings/ClientUrlManager";
import { DeleteTeamDangerZone } from "@/components/settings/DeleteTeamDangerZone";
import Image from "next/image";
import {
  Settings,
  Building2,
  Link2,
  AlertTriangle,
  Loader2,
  Check,
  Image as ImageIcon,
  Copy,
  FileText,
  Globe,
} from "lucide-react";

type SettingsTab = "general" | "client-urls" | "danger";

const tabs: { id: SettingsTab; label: string; icon: typeof Settings; description: string }[] = [
  { id: "general", label: "General", icon: Building2, description: "Team identity & preferences" },
  { id: "client-urls", label: "Client URLs", icon: Globe, description: "Public AI chat interfaces" },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, description: "Irreversible actions" },
];

export function SettingsPageClient() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { currentTeam, refetch } = useTeams();
  const supabase = createSupabaseBrowserClient();
  const canAdmin = currentTeam ? canPerform("admin", currentTeam.role) : false;

  const [teamName, setTeamName] = useState("");
  const [teamWebsite, setTeamWebsite] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);
  const [pdfViewerEnabled, setPdfViewerEnabled] = useState<boolean>(true);
  const [isUpdatingPdfSetting, setIsUpdatingPdfSetting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
      setTeamWebsite(currentTeam.website ?? "");
      fetchTeamCode();
      fetchPdfSetting();
    }
  }, [currentTeam]);

  const fetchTeamCode = async () => {
    if (!currentTeam) return;
    const { data } = await supabase
      .from("teams")
      .select("team_code")
      .eq("id", currentTeam.id)
      .single();
    if (data?.team_code) setTeamCode(data.team_code);
  };

  const fetchPdfSetting = async () => {
    if (!currentTeam) return;
    try {
      const response = await fetch(`/api/teams/settings?teamId=${currentTeam.id}`);
      if (response.ok) {
        const data = await response.json();
        setPdfViewerEnabled(data.settings?.pdfViewerEnabled ?? true);
      }
    } catch (err) {
      console.error("Failed to fetch PDF setting:", err);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const renameTeam = async () => {
    if (!currentTeam || !teamName.trim()) return;
    setIsRenaming(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("teams")
        .update({ name: teamName.trim() })
        .eq("id", currentTeam.id);
      if (error) throw new Error(error.message);
      await refetch();
      showSuccess("Team name updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename team");
    } finally {
      setIsRenaming(false);
    }
  };

  const saveWebsite = async () => {
    if (!currentTeam) return;
    setIsSavingWebsite(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("teams")
        .update({ website: teamWebsite.trim() || null })
        .eq("id", currentTeam.id);
      if (error) throw new Error(error.message);
      await refetch();
      showSuccess("Website updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update website");
    } finally {
      setIsSavingWebsite(false);
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
        .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
      if (upErr) throw upErr;
      const { data: publicUrl } = supabase.storage.from("team-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("teams")
        .update({ logo_url: publicUrl.publicUrl })
        .eq("id", currentTeam.id);
      if (updErr) throw updErr;
      await refetch();
      setLogoPreview(null);
      showSuccess("Team logo updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update logo");
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const togglePdfSetting = async () => {
    const newValue = !pdfViewerEnabled;
    setIsUpdatingPdfSetting(true);
    setError(null);
    try {
      const response = await fetch("/api/teams/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { pdfViewerEnabled: newValue } }),
      });
      if (response.ok) {
        setPdfViewerEnabled(newValue);
        showSuccess(`Document viewer ${newValue ? "enabled" : "disabled"}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Could not update setting");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update setting");
    } finally {
      setIsUpdatingPdfSetting(false);
    }
  };

  const copyTeamCode = async () => {
    if (!teamCode) return;
    await navigator.clipboard.writeText(teamCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative z-10">
        <div className="p-6 md:p-8 lg:p-10 flex flex-col min-h-0 max-w-5xl w-full mx-auto">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl overflow-hidden",
                "bg-gradient-to-br from-primary/20 to-primary/5",
                "border border-border/40",
                "flex items-center justify-center",
                "shadow-lg shadow-primary/5"
              )}>
                {currentTeam?.logo_url ? (
                  <Image
                    src={currentTeam.logo_url}
                    alt={currentTeam.name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Settings className="w-5 h-5 text-primary/60" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your workspace configuration for {currentTeam.name}
                </p>
              </div>
            </div>
          </motion.header>

          {/* Tab Navigation */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-8"
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
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      tab.id === "danger" && isActive && "text-destructive"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settingsActiveTab"
                        className={cn(
                          "absolute inset-0 rounded-lg shadow-sm border",
                          tab.id === "danger"
                            ? "bg-destructive/5 border-destructive/20"
                            : "bg-background border-border/50"
                        )}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={cn(
                      "w-4 h-4 relative z-10",
                      tab.id === "danger" && isActive && "text-destructive"
                    )} />
                    <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.nav>

          {/* Toasts */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">{successMsg}</span>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80">
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <TabContent key="general">
                <GeneralSettings
                  currentTeam={currentTeam}
                  canAdmin={canAdmin}
                  teamName={teamName}
                  setTeamName={setTeamName}
                  isRenaming={isRenaming}
                  onRename={renameTeam}
                  teamWebsite={teamWebsite}
                  setTeamWebsite={setTeamWebsite}
                  isSavingWebsite={isSavingWebsite}
                  onSaveWebsite={saveWebsite}
                  teamCode={teamCode}
                  copiedCode={copiedCode}
                  onCopyCode={copyTeamCode}
                  logoPreview={logoPreview}
                  isUpdatingLogo={isUpdatingLogo}
                  onOpenLogoDialog={() => setLogoDialogOpen(true)}
                  pdfViewerEnabled={pdfViewerEnabled}
                  isUpdatingPdfSetting={isUpdatingPdfSetting}
                  onTogglePdfSetting={togglePdfSetting}
                />
              </TabContent>
            )}
            {activeTab === "client-urls" && (
              <TabContent key="client-urls">
                <ClientUrlsSettings teamId={currentTeam.id} />
              </TabContent>
            )}
            {activeTab === "danger" && (
              <TabContent key="danger">
                <DangerSettings />
              </TabContent>
            )}
          </AnimatePresence>
        </div>
      </div>

      <TeamLogoDialog
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
        onConfirm={async (file) => {
          setLogoPreview(URL.createObjectURL(file));
          await updateTeamLogo(file);
        }}
      />
    </div>
  );
}

function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function SettingsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl p-6",
      "bg-background/60 backdrop-blur-sm",
      "border border-border/30",
      className
    )}>
      {children}
    </div>
  );
}

function SettingsCardHeader({
  icon: Icon,
  title,
  description,
  iconClassName,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={cn("p-2 rounded-xl bg-primary/10", iconClassName)}>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
        enabled
          ? "bg-emerald-500 border-emerald-500/50 focus:ring-emerald-500/50 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          : "bg-muted border-border/50 focus:ring-muted hover:bg-muted/80",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition-all duration-200 ease-in-out",
        "bg-white dark:bg-white",
        enabled ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

// ─── General Settings Tab ────────────────────────────────────────────────────

function GeneralSettings({
  currentTeam,
  canAdmin,
  teamName,
  setTeamName,
  isRenaming,
  onRename,
  teamWebsite,
  setTeamWebsite,
  isSavingWebsite,
  onSaveWebsite,
  teamCode,
  copiedCode,
  onCopyCode,
  logoPreview,
  isUpdatingLogo,
  onOpenLogoDialog,
  pdfViewerEnabled,
  isUpdatingPdfSetting,
  onTogglePdfSetting,
}: {
  currentTeam: { id: string; name: string; logo_url?: string | null; role: string };
  canAdmin: boolean;
  teamName: string;
  setTeamName: (name: string) => void;
  isRenaming: boolean;
  onRename: () => void;
  teamWebsite: string;
  setTeamWebsite: (url: string) => void;
  isSavingWebsite: boolean;
  onSaveWebsite: () => void;
  teamCode: string;
  copiedCode: boolean;
  onCopyCode: () => void;
  logoPreview: string | null;
  isUpdatingLogo: boolean;
  onOpenLogoDialog: () => void;
  pdfViewerEnabled: boolean;
  isUpdatingPdfSetting: boolean;
  onTogglePdfSetting: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Team Identity */}
      <SettingsCard>
        <SettingsCardHeader
          icon={Building2}
          title="Team Identity"
          description="Customize how your team appears"
        />

        <div className="space-y-6">
          {/* Team Logo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Team Logo</label>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-muted/30 border border-border/30 shadow-sm">
                {logoPreview ? (
                  <Image src={logoPreview} alt="preview" fill className="object-cover" />
                ) : currentTeam.logo_url ? (
                  <Image
                    src={currentTeam.logo_url}
                    alt={currentTeam.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Button variant="outline" size="sm" onClick={onOpenLogoDialog} disabled={!canAdmin}>
                  {isUpdatingLogo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Change Logo"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">Square image, 512×512px recommended</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/30" />

          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Team Name</label>
            <div className="flex items-center gap-3">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="flex-1 bg-muted/20 border-border/30"
                disabled={!canAdmin}
              />
              <Button onClick={onRename} disabled={isRenaming || !teamName.trim() || !canAdmin} size="sm">
                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>

          {/* Team Website */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Website</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="url"
                  value={teamWebsite}
                  onChange={(e) => setTeamWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="pl-9 bg-muted/20 border-border/30"
                  disabled={!canAdmin}
                />
              </div>
              <Button onClick={onSaveWebsite} disabled={isSavingWebsite || !canAdmin} size="sm">
                {isSavingWebsite ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Your team&apos;s public website URL</p>
          </div>

          {/* Team Code */}
          {teamCode && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Team Code</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                  <code className="text-sm font-mono text-foreground">{teamCode}</code>
                </div>
                <Button variant="outline" size="sm" onClick={onCopyCode} className="gap-1.5 shrink-0">
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Unique identifier for your team</p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Preferences */}
      <SettingsCard>
        <SettingsCardHeader
          icon={FileText}
          title="Documents & Chat"
          description="Configure document access and chat behavior"
        />

        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/20">
          <div>
            <label className="text-sm font-medium text-foreground">
              Allow opening documents from chat
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Let users open PDF, images, and text files from source citations
            </p>
          </div>
          <ToggleSwitch
            enabled={pdfViewerEnabled}
            onChange={onTogglePdfSetting}
            disabled={isUpdatingPdfSetting || !canAdmin}
          />
        </div>
      </SettingsCard>

      {!canAdmin && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/20 border border-border/20">
          <Badge variant="outline" className="text-xs">View Only</Badge>
          <span className="text-sm text-muted-foreground">
            You need admin or owner permissions to modify settings.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Client URLs Tab ─────────────────────────────────────────────────────────

function ClientUrlsSettings({ teamId }: { teamId: string }) {
  return (
    <SettingsCard>
      <ClientUrlManager teamId={teamId} />
    </SettingsCard>
  );
}

// ─── Danger Zone Tab ─────────────────────────────────────────────────────────

function DangerSettings() {
  return (
    <div className="space-y-6">
      <SettingsCard className="border-destructive/20 bg-destructive/5">
        <SettingsCardHeader
          icon={AlertTriangle}
          title="Danger Zone"
          description="These actions are permanent and cannot be undone"
          iconClassName="bg-destructive/10"
        />
        <DeleteTeamDangerZone />
      </SettingsCard>
    </div>
  );
}
