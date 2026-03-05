import React from "react";
import { Timeline } from "@/components/ui/timeline";
import {
  UserPlus, Building2, Upload, BrainCircuit,
  Globe, BarChart3, MessageSquareText, ShieldCheck,
  FileText, Sparkles, Zap, Palette,
} from "lucide-react";

function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-4">
      {children}
    </span>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-primary" />
      </div>
      {label}
    </div>
  );
}

function AppPreview({ title, description, children, className }: { title: string; description: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden ${className || ""}`}>
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
            app.klever.ai
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-5">
        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{description}</p>
        {children}
      </div>
    </div>
  );
}

export function TimelineSection() {
  const data = [
    {
      title: "Sign Up",
      content: (
        <div>
          <StepBadge><UserPlus className="w-3 h-3" /> Step 1</StepBadge>
          <p className="mb-6 text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Create your account in seconds with email or Google. Name your team
            and you&apos;re in &mdash; no credit card required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppPreview title="Create Account" description="Email, password, and team name — all in one step.">
              <div className="space-y-3">
                <div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center px-3 text-xs text-neutral-400">you@company.com</div>
                <div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center px-3 text-xs text-neutral-400">••••••••</div>
                <div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center px-3 text-xs text-neutral-400">Acme Corp</div>
                <div className="h-10 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white">Create Account</div>
              </div>
            </AppPreview>
            <AppPreview title="Onboarding" description="Upload a logo, invite your team, explore plans.">
              <div className="space-y-2.5">
                <FeatureChip icon={Palette} label="Add a team logo" />
                <FeatureChip icon={UserPlus} label="Invite team members" />
                <FeatureChip icon={Sparkles} label="Explore features & pick a plan" />
              </div>
            </AppPreview>
          </div>
        </div>
      ),
    },
    {
      title: "Build",
      content: (
        <div>
          <StepBadge><Upload className="w-3 h-3" /> Step 2</StepBadge>
          <p className="mb-6 text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Upload documents, connect your drives, and let Klever index everything.
            Your AI knowledge base is built automatically as files are ingested.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppPreview title="File Explorer" description="Drag-and-drop files or connect Google Drive, Nextcloud, OneDrive.">
              <div className="grid grid-cols-3 gap-2">
                {["Members", "Contracts", "Onboarding"].map((name) => (
                  <div key={name} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <div className="w-8 h-7 rounded bg-gradient-to-br from-blue-400 to-blue-500 opacity-80" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </AppPreview>
            <AppPreview title="Knowledge Topics" description="Klever discovers topics automatically from your documents.">
              <div className="flex flex-wrap gap-1.5">
                {["Security Policy", "Onboarding", "Benefits", "Remote Work", "Compliance", "IT Setup"].map((t) => (
                  <span key={t} className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50">
                    {t}
                  </span>
                ))}
              </div>
            </AppPreview>
          </div>
        </div>
      ),
    },
    {
      title: "Launch",
      content: (
        <div>
          <StepBadge><Zap className="w-3 h-3" /> Step 3</StepBadge>
          <p className="mb-6 text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Chat with your AI, share knowledge with clients via branded pages,
            and monitor quality with real-time analytics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppPreview title="AI Chat" description="Ask questions and get instant answers from your docs.">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 shrink-0" />
                  <div className="flex-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
                    What is our remote work policy?
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shrink-0 flex items-center justify-center">
                    <BrainCircuit className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-xs text-neutral-700 dark:text-neutral-200">
                    Based on your company handbook, employees can work remotely up to 3 days per week…
                  </div>
                </div>
              </div>
            </AppPreview>
            <div className="space-y-4">
              <AppPreview title="Client Pages" description="Public-facing AI chat for your customers.">
                <div className="flex items-center gap-3">
                  <FeatureChip icon={Globe} label="Branded chat pages" />
                  <FeatureChip icon={ShieldCheck} label="Access controls" />
                </div>
              </AppPreview>
              <AppPreview title="Analytics" description="Track confidence, quality, and recommendations.">
                <div className="flex items-center gap-3">
                  <FeatureChip icon={BarChart3} label="Real-time insights" />
                  <FeatureChip icon={MessageSquareText} label="Quality metrics" />
                </div>
              </AppPreview>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-full overflow-clip">
      <Timeline data={data} />
    </div>
  );
}
