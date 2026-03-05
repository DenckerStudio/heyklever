"use client";

import { Button } from "@/components/ui/button";
import MagneticButton from "@/components/ui/magnetic-button";
import {
  Zap, HardDrive, Database, Loader2, Globe,
  BrainCircuit, FileSearch, MessageSquareText, Lightbulb, ShieldCheck, BarChart3, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useRef } from "react";
import { PLATFORM_PLANS, PlanSlug } from "@/lib/pricing-constants";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "RAG-Powered AI Chat",
    description: "Ask questions across every document your team uploads. Klever retrieves the most relevant context and answers instantly.",
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-500",
  },
  {
    icon: Globe,
    title: "Client Pages",
    description: "Publish branded, public-facing pages where clients can chat with your team's AI knowledge base — no login required.",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Lightbulb,
    title: "AI Knowledge Recommendations",
    description: "Klever learns from your docs and proactively suggests content improvements, gaps in coverage, and training opportunities.",
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-500",
  },
  {
    icon: FileSearch,
    title: "Smart Document Ingestion",
    description: "Upload files from Supabase, Google Drive, Nextcloud, or OneDrive. Klever indexes everything for instant search and retrieval.",
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-500",
  },
  {
    icon: MessageSquareText,
    title: "AI Docs & Audio Overviews",
    description: "Auto-generate rich documentation and audio summaries from your uploaded files — perfect for onboarding and training.",
    color: "from-pink-500/20 to-pink-600/10",
    iconColor: "text-pink-500",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description: "Track AI chat usage, document evaluations, and knowledge quality metrics so you can optimise your team's workflow.",
    color: "from-cyan-500/20 to-cyan-600/10",
    iconColor: "text-cyan-500",
  },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative rounded-2xl border border-border/40 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300"
    >
      <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", feature.color)} />
      <div className="relative z-10 space-y-3">
        <div className={cn("w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center", feature.iconColor)}>
          <feature.icon className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-foreground">{feature.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  );
}

function PlanCard({
  slug,
  isSelected,
  onSelect,
}: {
  slug: PlanSlug;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const plan = PLATFORM_PLANS[slug];
  const popular = slug === "growth";
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start rounded-2xl border p-6 text-left transition-all duration-300 w-full",
        isSelected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
          : "border-border/50 bg-card hover:border-border hover:shadow-md"
      )}
    >
      {popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground tracking-wide uppercase">
          Popular
        </span>
      )}
      <span className="text-sm font-medium text-muted-foreground">{plan.name}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-primary" />
          {(plan.includedTokens / 1_000_000).toFixed(0)}M AI tokens
        </li>
        <li className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-primary" />
          {plan.specs.storage} storage
        </li>
        <li className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          {plan.specs.clientPages} client page{plan.specs.clientPages !== 1 ? "s" : ""}
        </li>
        <li className="flex items-center gap-2">
          <BrainCircuit className="w-3.5 h-3.5 text-primary" />
          RAG AI included
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Unlimited documents
        </li>
      </ul>
    </button>
  );
}

export default function FeaturesPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>("growth");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const teamId = document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1];
      if (!teamId) {
        alert("Team ID not found. Please try refreshing.");
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, planSlug: selectedPlan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 md:px-10 pb-20">

        {/* ── Hero ── */}
        <section className="pt-12 pb-16 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-2"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Powered by AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
          >
            Your team&apos;s
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
              AI knowledge hub
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Upload your docs, train the AI on your knowledge, and let Klever answer questions for your team and your clients&nbsp;— instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button size="lg" className="rounded-xl h-12 px-8 text-base" onClick={scrollToPricing}>
              See plans <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-bold">Everything you need</h2>
            <p className="text-muted-foreground mt-2">All the tools to turn your documents into a living knowledge base.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section ref={pricingRef} className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted-foreground mt-2">
              14-day free trial on every plan. Cancel anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {(["starter", "growth", "pro"] as const).map((slug, i) => (
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <PlanCard
                  slug={slug}
                  isSelected={selectedPlan === slug}
                  onSelect={() => setSelectedPlan(slug)}
                />
              </motion.div>
            ))}
          </div>

          {/* Checkout CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <MagneticButton distance={0.3}>
              <Button
                size="lg"
                className="h-14 px-10 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                <AnimatePresence mode="wait">
                  {isCheckingOut ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> Preparing…
                    </motion.span>
                  ) : (
                    <motion.span key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      Get Started with {PLATFORM_PLANS[selectedPlan].name} <Zap className="w-5 h-5 fill-current" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </MagneticButton>
            <p className="text-xs text-muted-foreground">
              Secure payment via Stripe · Cancel anytime
            </p>
          </motion.div>
        </section>

      </div>
    </div>
  );
}
