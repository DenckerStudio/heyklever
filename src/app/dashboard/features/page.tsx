"use client";

import { Button } from "@/components/ui/button";
import MagneticButton from "@/components/ui/magnetic-button";
import { Zap, HardDrive, Database, Loader2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { PLATFORM_PLANS, PlanSlug } from "@/lib/pricing-constants";
import { cn } from "@/lib/utils";

export default function FeaturesPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>('growth');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const teamId = document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1];
      if (!teamId) {
        // Fallback or error handling
        alert("Team ID not found. Please try refreshing.");
        return;
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId,
          planSlug: selectedPlan,
        }),
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

  const plan = PLATFORM_PLANS[selectedPlan];

  return (
    <div className="flex-1 w-full h-full p-6 md:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-16 pb-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome to HeyKlever
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Supercharge your team with intelligent AI tools.<br/>
              Unlock the full potential of your knowledge base.
            </p>
          </motion.div>
        </div>

        {/* Interactive Plan Selection */}
        <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto"
        >
            <div className="bg-card rounded-3xl shadow-xl border border-border/20 overflow-hidden relative">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="p-8 md:p-10 relative z-10">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Select Your Power Level</h2>
                        <p className="text-muted-foreground">Scale your AI capabilities as you grow.</p>
                    </div>

                    {/* Custom Segmented Control */}
                    <div className="bg-muted p-1.5 rounded-xl flex relative mb-10 max-w-lg mx-auto">
                        {(['starter', 'growth', 'pro'] as const).map((slug) => (
                            <button
                                key={slug}
                                onClick={() => setSelectedPlan(slug)}
                                className={cn(
                                    "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 relative z-10",
                                    selectedPlan === slug ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {slug.charAt(0).toUpperCase() + slug.slice(1)}
                            </button>
                        ))}
                        {/* Animated Slider Background */}
                        <motion.div 
                            className="absolute top-1.5 bottom-1.5 rounded-lg bg-primary shadow-sm"
                            initial={false}
                            animate={{
                                left: selectedPlan === 'starter' ? '6px' : selectedPlan === 'growth' ? '33.33%' : '66.66%',
                                x: selectedPlan === 'starter' ? 0 : selectedPlan === 'growth' ? 4 : 8,
                                width: 'calc(33.33% - 8px)'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    </div>

                    {/* Dynamic Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedPlan}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col md:flex-row items-center justify-between gap-8 md:px-8"
                        >
                            <div className="space-y-6 flex-1">
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-bold tracking-tight">${plan.price}</span>
                                        <span className="text-muted-foreground">/mo</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                                        {plan.name} Plan
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Monthly subscription + usage-based AI pricing
                                    </p>
                                </div>
                                
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-foreground">{(plan.includedTokens / 1000000).toFixed(0)}M</span>
                                            <span className="text-muted-foreground ml-1">Included Tokens</span>
                                            <span className="text-muted-foreground text-xs block mt-0.5">Overage billed at usage rates</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <HardDrive className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-foreground">{plan.specs.storage}</span>
                                            <span className="text-muted-foreground ml-1">Storage & {plan.specs.documents} Documents</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-foreground">{plan.specs.clientPages}</span>
                                            <span className="text-muted-foreground ml-1">Client Page{plan.specs.clientPages !== 1 ? 's' : ''}</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex-1 w-full md:w-auto flex justify-center md:justify-end">
                                <MagneticButton distance={0.3}>
                                    <Button 
                                        size="lg" 
                                        className="w-full md:w-auto h-14 px-8 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                                        onClick={handleCheckout}
                                        disabled={isCheckingOut}
                                    >
                                        {isCheckingOut ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Preparing...
                                            </>
                                        ) : (
                                            <>
                                                Get Started <Zap className="ml-2 w-5 h-5 fill-current" />
                                            </>
                                        )}
                                    </Button>
                                </MagneticButton>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Info Footer */}
                    <div className="mt-10 pt-6 border-t border-border text-center">
                        <p className="text-xs text-muted-foreground">
                            Includes 14-day free trial • Cancel anytime • Secure payment via Stripe
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>

      </div>
    </div>
  );
}

