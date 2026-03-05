"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  ImagePlus, Users, Sparkles, Check, ChevronRight,
  Upload, Loader2, ArrowRight, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  memberCount: number;
}

type StepId = "logo" | "invite" | "explore";

interface Step {
  id: StepId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
}

export function OnboardingChecklist({
  teamId,
  teamName,
  teamLogo,
  memberCount,
}: OnboardingChecklistProps) {
  const router = useRouter();
  const [expandedStep, setExpandedStep] = useState<StepId | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(teamLogo);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteSending, setInviteSending] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const d = localStorage.getItem("klever_onboarding_dismissed");
      if (d === teamId) setDismissed(true);
    }
  }, [teamId]);

  const steps: Step[] = [
    {
      id: "logo",
      title: "Add a team logo",
      description: "Give your workspace a visual identity.",
      icon: ImagePlus,
      done: !!currentLogo,
    },
    {
      id: "invite",
      title: "Invite team members",
      description: "Collaborate with your colleagues.",
      icon: Users,
      done: (memberCount + invitedEmails.length) > 1,
    },
    {
      id: "explore",
      title: "Explore features & pick a plan",
      description: "Unlock RAG AI, Client Pages, and more.",
      icon: Sparkles,
      done: false,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  const handleLogoUpload = useCallback(async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/teams/upload-logo", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const updateRes = await fetch("/api/teams/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, logo_url: uploadData.url || uploadData.tempPath }),
      });
      if (updateRes.ok) {
        const d = await updateRes.json();
        setCurrentLogo(d.logo_url || uploadData.url || "uploaded");
      }
    } catch (e) {
      console.error("Logo upload failed:", e);
    } finally {
      setLogoUploading(false);
    }
  }, [teamId]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) return;
    setInviteSending(true);
    try {
      const res = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInvitedEmails((prev) => [...prev, inviteEmail]);
        setInviteEmail("");
      }
    } catch (e) {
      console.error("Invite failed:", e);
    } finally {
      setInviteSending(false);
    }
  }, [teamId, inviteEmail, inviteRole]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("klever_onboarding_dismissed", teamId);
    }
    setDismissed(true);
    router.refresh();
  };

  if (dismissed) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 max-w-md"
        >
          <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
          <p className="text-muted-foreground">Use the sidebar to navigate your workspace. When you&apos;re ready, explore plans to unlock all features.</p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/overview")}>
              Go to Overview
            </Button>
            <Button onClick={() => router.push("/dashboard/features")}>
              Explore Plans <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        {/* Welcome header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome to {teamName}
          </h1>
          <p className="text-muted-foreground text-lg">
            Let&apos;s get your workspace ready. Complete these steps or skip ahead anytime.
          </p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{completedCount} of {steps.length} completed</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / steps.length) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </motion.div>

        {/* Checklist */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200",
                  expandedStep === step.id
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border/60 bg-card hover:border-border hover:shadow-sm",
                  step.done && "opacity-70"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step.done ? <Check className="w-4 h-4" /> : <StepIcon icon={step.icon} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn("font-medium text-sm", step.done && "line-through")}>{step.title}</span>
                  <span className="block text-xs text-muted-foreground">{step.description}</span>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                  expandedStep === step.id && "rotate-90"
                )} />
              </button>

              <AnimatePresence>
                {expandedStep === step.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 pb-1 px-1">
                      {step.id === "logo" && (
                        <LogoStep
                          currentLogo={currentLogo}
                          uploading={logoUploading}
                          onUpload={handleLogoUpload}
                        />
                      )}
                      {step.id === "invite" && (
                        <InviteStep
                          email={inviteEmail}
                          setEmail={setInviteEmail}
                          role={inviteRole}
                          setRole={setInviteRole}
                          sending={inviteSending}
                          onSend={handleInvite}
                          invitedEmails={invitedEmails}
                        />
                      )}
                      {step.id === "explore" && (
                        <div className="flex gap-3">
                          <Button onClick={() => router.push("/dashboard/features")}>
                            See Features & Plans <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Skip / Dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center pt-4"
        >
          <button
            onClick={handleDismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Skip setup and explore the dashboard <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function StepIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return <Icon className="w-4 h-4" />;
}

function LogoStep({
  currentLogo,
  uploading,
  onUpload,
}: {
  currentLogo: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
        {currentLogo ? (
          <img src={currentLogo} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo-upload" className="cursor-pointer">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            ) : currentLogo ? (
              <><Upload className="w-4 h-4" /> Change logo</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload an image</>
            )}
          </span>
        </Label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
          disabled={uploading}
        />
        <p className="text-xs text-muted-foreground">PNG, JPG, or SVG up to 2 MB</p>
      </div>
    </div>
  );
}

function InviteStep({
  email,
  setEmail,
  role,
  setRole,
  sending,
  onSend,
  invitedEmails,
}: {
  email: string;
  setEmail: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  invitedEmails: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
          disabled={sending}
          className="flex-1"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          disabled={sending}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button size="sm" onClick={onSend} disabled={sending || !email}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
        </Button>
      </div>
      {invitedEmails.length > 0 && (
        <div className="space-y-1">
          {invitedEmails.map((e) => (
            <div key={e} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="w-3 h-3 text-primary" /> Invited {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
