"use client";

import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  ExternalLink,
  Copy,
  Loader2,
  Check,
  AlertCircle,
  X,
  Link2,
  Globe,
  Sparkles,
  Eye,
  FileText,
  ChevronRight,
  Languages,
  MessageSquare,
  Search,
  BookOpen,
  Settings2,
  Type,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileAccessSelector } from "./FileAccessSelector";

// Language options
const LANGUAGE_OPTIONS = [
  { value: "no", label: "Norsk", flag: "🇳🇴" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "sv", label: "Svenska", flag: "🇸🇪" },
  { value: "da", label: "Dansk", flag: "🇩🇰" },
] as const;

type Language = typeof LANGUAGE_OPTIONS[number]["value"];
type FileAccessMode = "all_public" | "selected_files";

export interface ClientUrlSettings {
  // Existing
  pdfViewerEnabled?: boolean;
  // Display settings
  displayName?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  // Language & behavior
  language?: Language;
  liveSearchEnabled?: boolean;
  showSources?: boolean;
  // File access
  fileAccessMode?: FileAccessMode;
  allowedFileIds?: string[];
}

interface ClientUrl {
  id: string;
  team_id: string;
  display_code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  full_url?: string;
  settings?: ClientUrlSettings;
}

interface ClientUrlManagerProps {
  teamId: string;
}

export function ClientUrlManager({ teamId }: ClientUrlManagerProps) {
  const [clientUrls, setClientUrls] = useState<ClientUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [limits, setLimits] = useState({ max: 1, current: 0, remaining: 1 });
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamPdfViewerEnabled, setTeamPdfViewerEnabled] = useState<boolean>(true);

  useEffect(() => {
    fetchClientUrls();
    fetchTeamSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const fetchTeamSettings = async () => {
    try {
      const response = await fetch(`/api/teams/settings?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamPdfViewerEnabled(data.settings?.pdfViewerEnabled ?? true);
      }
    } catch (err) {
      console.error("Failed to fetch team settings:", err);
    }
  };

  const fetchClientUrls = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/teams/client-urls");
      if (response.ok) {
        const data = await response.json();
        setClientUrls(data.clientUrls || []);
        setLimits(data.limits || { max: 1, current: 0, remaining: 1 });
      }
    } catch (err) {
      console.error("Error fetching client URLs:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: { name?: string; description?: string } = {};

    if (!name.trim()) {
      errors.name = "Client name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Client name must be at least 2 characters";
    } else if (name.trim().length > 50) {
      errors.name = "Client name must be less than 50 characters";
    }

    if (description.trim().length > 200) {
      errors.description = "Description must be less than 200 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createClientUrl = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/teams/client-urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setClientUrls((prev) => [data.clientUrl, ...prev]);
        setLimits((prev) => ({
          ...prev,
          current: prev.current + 1,
          remaining: prev.remaining - 1,
        }));
        setSuccess(`Client URL "${name.trim()}" created successfully!`);
        setShowCreateForm(false);
        setName("");
        setDescription("");
        setFormErrors({});

        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || "Failed to create client URL");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setShowCreateForm(false);
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground">Loading client URLs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20">
            <Link2 className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Client URLs</h3>
            <p className="text-sm text-muted-foreground">
              Create public AI chat interfaces for your clients
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Usage Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  limits.remaining > 0 ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              <span className="text-xs font-medium text-foreground">
                {limits.current}/{limits.max}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">URLs used</span>
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={isSubmitting || limits.remaining === 0}
            size="sm"
            className={cn(
              "gap-2 transition-all duration-300",
              showCreateForm && "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {showCreateForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create URL
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="p-1.5 rounded-full bg-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 flex-1">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="p-1 rounded-full hover:bg-emerald-500/10 transition-colors"
            >
              <X className="w-4 h-4 text-emerald-500" />
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
          >
            <div className="p-1.5 rounded-full bg-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-sm text-destructive flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-full hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground">Create New Client URL</h4>
                  <p className="text-sm text-muted-foreground">
                    Set up a public AI chat interface for your clients
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Client Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Client Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formErrors.name) {
                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="e.g., Student Portal, Client Dashboard"
                    className={cn(
                      "bg-background/60 border-border/40",
                      formErrors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                    maxLength={50}
                  />
                  <div className="flex items-center justify-between">
                    {formErrors.name ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.name}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-muted-foreground">{name.length}/50</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Description <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (formErrors.description) {
                        setFormErrors((prev) => ({ ...prev, description: undefined }));
                      }
                    }}
                    placeholder="Brief description of this client interface"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/40 text-foreground text-sm resize-none transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                      formErrors.description && "border-destructive focus:ring-destructive"
                    )}
                    rows={3}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between">
                    {formErrors.description ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.description}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-muted-foreground">{description.length}/200</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={createClientUrl}
                    disabled={isSubmitting || !name.trim()}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Create Client URL
                      </>
                    )}
                  </Button>
                  <Button onClick={resetForm} variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client URLs List or Empty State */}
      {clientUrls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-br from-muted/20 to-muted/5"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 text-center">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 flex items-center justify-center">
                <Globe className="w-10 h-10 text-primary/60" />
              </div>
              {/* Floating sparkle */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
            </div>

            {/* Text */}
            <h4 className="text-xl font-semibold text-foreground mb-2">No Client URLs Yet</h4>
            <p className="text-sm text-muted-foreground max-w-sm mb-8">
              Create your first client interface to start sharing AI-powered chat experiences with
              your clients and customers.
            </p>

            {/* Features */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <FeatureChip icon={Globe} label="Public access" />
              <FeatureChip icon={Sparkles} label="AI-powered" />
              <FeatureChip icon={FileText} label="Document support" />
            </div>

            {/* CTA */}
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={limits.remaining === 0}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Create Your First Client URL
              <ChevronRight className="w-4 h-4" />
            </Button>

            {limits.remaining === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                You&apos;ve reached the maximum number of client URLs for your plan.
              </p>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* List Header */}
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-medium text-foreground">Your Client URLs</h4>
            <Badge variant="outline" className="text-xs">
              {clientUrls.length} {clientUrls.length === 1 ? "URL" : "URLs"}
            </Badge>
          </div>

          {/* URL Cards */}
          <div className="space-y-4">
            {clientUrls.map((url, index) => (
              <ClientUrlCard
                key={url.id}
                url={url}
                index={index}
                onCopy={copyToClipboard}
                copied={copiedUrl === url.full_url}
                teamPdfViewerEnabled={teamPdfViewerEnabled}
                onSettingsUpdate={async (urlId, newSettings) => {
                  try {
                    const response = await fetch("/api/teams/client-urls", {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        id: urlId,
                        settings: newSettings,
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      setClientUrls((prev) =>
                        prev.map((u) => (u.id === urlId ? { ...u, settings: data.settings } : u))
                      );
                      return;
                    } else {
                      const data = await response.json();
                      setError(data.error || "Could not update setting");
                      throw new Error(data.error || "Could not update setting");
                    }
                  } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : "Could not update setting";
                    setError(errorMsg);
                    throw err;
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Feature Chip Component
function FeatureChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/30">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Toggle Switch Component
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
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition-all duration-200 ease-in-out",
          "bg-white dark:bg-white",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// Settings Section Component
function SettingsSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/20 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 pt-0 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Setting Row Component
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Client URL Card Component
function ClientUrlCard({
  url,
  index,
  onCopy,
  copied,
  teamPdfViewerEnabled,
  onSettingsUpdate,
}: {
  url: ClientUrl;
  index: number;
  onCopy: (url: string) => void;
  copied: boolean;
  teamPdfViewerEnabled: boolean;
  onSettingsUpdate: (urlId: string, settings: Partial<ClientUrlSettings>) => Promise<void>;
}) {
  // Local settings state
  const [settings, setSettings] = useState<ClientUrlSettings>(url.settings || {});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<ClientUrlSettings>>({});
  const [fileSelectOpen, setFileSelectOpen] = useState(false);

  // Sync with prop changes
  React.useEffect(() => {
    setSettings(url.settings || {});
  }, [url.settings]);

  // Debounced save function
  const saveSettings = useCallback(
    async (newSettings: Partial<ClientUrlSettings>) => {
      setIsUpdating(true);
      try {
        await onSettingsUpdate(url.id, newSettings);
        setPendingChanges({});
      } catch (err) {
        console.error("Failed to save settings:", err);
      } finally {
        setIsUpdating(false);
      }
    },
    [url.id, onSettingsUpdate]
  );

  // Handle toggle changes (immediate save)
  const handleToggle = async (key: keyof ClientUrlSettings) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    await saveSettings({ [key]: newValue });
  };

  // Handle text input changes (debounced save)
  const handleTextChange = (key: keyof ClientUrlSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  // Handle select changes (immediate save)
  const handleSelectChange = async (key: keyof ClientUrlSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await saveSettings({ [key]: value });
  };

  // Save pending text changes on blur
  const handleBlur = async () => {
    if (Object.keys(pendingChanges).length > 0) {
      await saveSettings(pendingChanges);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-background/60 backdrop-blur-sm",
        "border border-border/30",
        "transition-all duration-300",
        "hover:border-border/50 hover:shadow-lg hover:shadow-primary/5"
      )}
    >
      {/* Accent Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-purple-500" />

      <div className="p-5 pl-6">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <ExternalLink className="w-5 h-5 text-primary" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground truncate">{url.name}</h4>
                {url.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {new Date(url.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(url.full_url || "")}
              className={cn(
                "h-8 gap-1.5 transition-all duration-300",
                copied &&
                  "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5">
              <a href={url.full_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </a>
            </Button>
          </div>
        </div>

        {/* Description */}
        {url.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{url.description}</p>
        )}

        {/* URL Display */}
        <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <code className="text-sm text-foreground break-all font-mono">{url.full_url}</code>
          </div>
        </div>

        {/* Settings Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          <span>Settings</span>
          {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
          <ChevronRight
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                {/* Display Settings Section */}
                <SettingsSection title="Display Settings" icon={Type} defaultOpen>
                  <div className="space-y-4">
                    {/* Display Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Display Name</label>
                      <Input
                        value={settings.displayName || ""}
                        onChange={(e) => handleTextChange("displayName", e.target.value)}
                        onBlur={handleBlur}
                        placeholder={url.name}
                        className="h-9 text-sm bg-background/60"
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground">
                        Custom name shown to clients (defaults to &quot;{url.name}&quot;)
                      </p>
                    </div>

                    {/* Welcome Message */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Welcome Message</label>
                      <textarea
                        value={settings.welcomeMessage || ""}
                        onChange={(e) => handleTextChange("welcomeMessage", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., Hello! How can I help you today?"
                        className={cn(
                          "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/40 text-foreground text-sm resize-none transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                        )}
                        rows={2}
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground">
                        Initial greeting message shown to users
                      </p>
                    </div>

                    {/* Placeholder Text */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Input Placeholder</label>
                      <Input
                        value={settings.placeholderText || ""}
                        onChange={(e) => handleTextChange("placeholderText", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., Ask me anything..."
                        className="h-9 text-sm bg-background/60"
                        maxLength={100}
                      />
                      <p className="text-xs text-muted-foreground">
                        Placeholder text in the chat input field
                      </p>
                    </div>
                  </div>
                </SettingsSection>

                {/* Language & Behavior Section */}
                <SettingsSection title="Language & Behavior" icon={Languages}>
                  <div className="space-y-4">
                    {/* Language */}
                    <SettingRow
                      label="Response Language"
                      description="Default language for AI responses"
                    >
                      <Select
                        value={settings.language || "no"}
                        onValueChange={(value) => handleSelectChange("language", value)}
                      >
                        <SelectTrigger className="w-[140px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              <span className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingRow>

                    {/* Live Search */}
                    <SettingRow
                      label="Live Search"
                      description="Show search suggestions while typing"
                    >
                      <ToggleSwitch
                        enabled={settings.liveSearchEnabled ?? false}
                        onChange={() => handleToggle("liveSearchEnabled")}
                        disabled={isUpdating}
                      />
                    </SettingRow>

                    {/* Show Sources */}
                    <SettingRow
                      label="Show Sources"
                      description="Display source citations in responses"
                    >
                      <ToggleSwitch
                        enabled={settings.showSources ?? true}
                        onChange={() => handleToggle("showSources")}
                        disabled={isUpdating}
                      />
                    </SettingRow>
                  </div>
                </SettingsSection>

                {/* Document Access Section */}
                <SettingsSection title="Document Access" icon={FolderOpen}>
                  <div className="space-y-4">
                    {/* PDF Viewer Toggle */}
                    {teamPdfViewerEnabled && (
                      <SettingRow
                        label="Allow Opening Documents"
                        description="Enable users to open documents (PDF, images) from sources"
                      >
                        <ToggleSwitch
                          enabled={settings.pdfViewerEnabled ?? true}
                          onChange={() => handleToggle("pdfViewerEnabled")}
                          disabled={isUpdating}
                        />
                      </SettingRow>
                    )}

                    {/* File Access Mode */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">File Access</label>
                      <div className="space-y-2">
                        <label
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            (settings.fileAccessMode || "all_public") === "all_public"
                              ? "bg-primary/5 border-primary/30"
                              : "border-border/30 hover:border-border/50"
                          )}
                        >
                          <input
                            type="radio"
                            name={`fileAccess-${url.id}`}
                            checked={(settings.fileAccessMode || "all_public") === "all_public"}
                            onChange={() => handleSelectChange("fileAccessMode", "all_public")}
                            className="sr-only"
                          />
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              (settings.fileAccessMode || "all_public") === "all_public"
                                ? "border-primary"
                                : "border-muted-foreground/50"
                            )}
                          >
                            {(settings.fileAccessMode || "all_public") === "all_public" && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">All Public Files</p>
                            <p className="text-xs text-muted-foreground">
                              Access all files marked as public or restricted for this client
                            </p>
                          </div>
                        </label>

                        <label
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            settings.fileAccessMode === "selected_files"
                              ? "bg-primary/5 border-primary/30"
                              : "border-border/30 hover:border-border/50"
                          )}
                        >
                          <input
                            type="radio"
                            name={`fileAccess-${url.id}`}
                            checked={settings.fileAccessMode === "selected_files"}
                            onChange={() => handleSelectChange("fileAccessMode", "selected_files")}
                            className="sr-only"
                          />
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              settings.fileAccessMode === "selected_files"
                                ? "border-primary"
                                : "border-muted-foreground/50"
                            )}
                          >
                            {settings.fileAccessMode === "selected_files" && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">Selected Files Only</p>
                            <p className="text-xs text-muted-foreground">
                              Only access specific files you select
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* File Selector */}
                      {settings.fileAccessMode === "selected_files" && (
                        <>
                          <div className="mt-3 p-4 rounded-lg bg-muted/20 border border-dashed border-border/30">
                            <div className="flex flex-col items-center justify-center gap-2 text-center py-2">
                              <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
                              <p className="text-sm text-muted-foreground">
                                {settings.allowedFileIds?.length
                                  ? `${settings.allowedFileIds.length} files selected`
                                  : "No files selected"}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setFileSelectOpen(true)}
                              >
                                <FileText className="w-4 h-4" />
                                Select Files
                              </Button>
                            </div>
                          </div>
                          <FileAccessSelector
                            open={fileSelectOpen}
                            onOpenChange={setFileSelectOpen}
                            selectedFileIds={settings.allowedFileIds || []}
                            onSelectionChange={async (fileIds) => {
                              setSettings((prev) => ({ ...prev, allowedFileIds: fileIds }));
                              await saveSettings({ allowedFileIds: fileIds });
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </SettingsSection>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
