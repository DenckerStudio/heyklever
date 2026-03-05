"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Cpu, Sparkles, BrainCircuit, Users, CheckCircle2, 
    Zap, ShieldCheck, TrendingUp, ChevronRight
} from 'lucide-react';

import Glow from "@/components/ui/glow";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/ui/shine-border";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const EXTENSIONS = [
	{
		title: "RAG Automation",
		description: "Retrieval-Augmented Generation to ground AI with your private data seamlessly.",
		icon: <BrainCircuit className="w-8 h-8 text-primary" />,
        span: { mobile: 1, tablet: 2, desktop: 2 },
	},
	{
		title: "Knowledge Gap Filler",
		description: "Automatically identify missing documentation and request intel from your team.",
		icon: <Sparkles className="w-8 h-8 text-amber-500" />,
        span: { mobile: 1, tablet: 1, desktop: 1 },
	},
	{
		title: "AI Recommendations",
		description: "Proactive, context-aware suggestions directly injected into your workflows.",
		icon: <TrendingUp className="w-8 h-8 text-green-500" />,
        span: { mobile: 1, tablet: 1, desktop: 1 },
	},
    {
		title: "Smart Agent Routing",
		description: "Deploy specific tasks to specialized AI agents dynamically based on context.",
		icon: <Cpu className="w-8 h-8 text-blue-500" />,
        span: { mobile: 1, tablet: 2, desktop: 2 },
	},
];

export default function BillingPage() {
	const supabase = createSupabaseBrowserClient();
	const [loadingKey, setLoadingKey] = useState<string | null>(null);
	const [subscription, setSubscription] = useState<any>(null);
    const [usage, setUsage] = useState<any>(null);

	useEffect(() => {
		void (async () => {
			try {
				const teamId = typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1] : null;
				if (!teamId) return;

                // Fetch Subscription
				const { data: sub } = await supabase
					.from('subscriptions')
					.select(`
                        *,
                        platform_subscriptions (*)
                    `)
					.eq('team_id', teamId)
					.in('status', ['active','trialing'])
					.maybeSingle();
				setSubscription(sub);

                // Fetch Usage Allowance for current period
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const { data: usageData } = await supabase
                    .from('usage_allowances')
                    .select('*')
                    .eq('team_id', teamId)
                    .eq('period_start', startOfMonth)
                    .maybeSingle();
                
                // Mock usage if no data yet (all teams start on Starter)
                setUsage(usageData || {
                    tokens_used: 125000,
                    tokens_included: 1000000,
                });
			} catch (e) {
                console.error(e);
			}
		})();
	}, [supabase]);

	const startCheckoutByPlan = async (planSlug: string) => {
		setLoadingKey(planSlug);
		try {
            const teamId = document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1];
            if (!teamId) return;

			const res = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ teamId, planSlug }),
			});
			const data = await res.json();
			if (data.url) window.location.href = data.url as string;
		} finally {
			setLoadingKey(null);
		}
	};
    
    const handleManageSubscription = async () => {
        setLoadingKey('portal');
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } finally {
            setLoadingKey(null);
        }
    };

    // Calculate usage values
    const usedM = usage ? (usage.tokens_used / 1000000).toFixed(2) : "0.00";
    const includedM = usage ? (usage.tokens_included / 1000000).toFixed(0) : "1";
    const percentUsed = usage ? Math.min(100, (usage.tokens_used / usage.tokens_included) * 100) : 0;
    const isOverage = usage && usage.tokens_used > usage.tokens_included;

	return (
		<div className="relative p-6 md:p-10 space-y-16 max-w-7xl mx-auto overflow-hidden">
			<Glow variant="above" className='absolute top-0 left-0 -z-1 opacity-50' />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
            >
			    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Billing & Usage</h1>
                <p className="text-muted-foreground text-lg">Manage your plan, extensions, and team capacity.</p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative"
            >
                <div className="relative rounded-3xl overflow-hidden bg-card/40 backdrop-blur-xl border border-border/50 shadow-2xl">
                    <ShineBorder shineColor={["#3b82f6", "#8b5cf6", "#ec4899"]} borderWidth={1.5} duration={10} />
                    
                    <div className="p-8 md:p-10 space-y-8 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-1">Current Plan</p>
                                <h2 className="text-3xl font-bold flex items-center gap-3">
                                    {subscription?.platform_subscriptions?.name || 'Starter'}
                                    <span className="text-sm font-normal px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                        Active
                                    </span>
                                </h2>
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md border-border/50"
                                onClick={handleManageSubscription}
                                disabled={loadingKey === 'portal'}
                            >
                                {loadingKey === 'portal' ? 'Loading...' : 'Manage Billing'}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-border/30">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Tokens Used This Period</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold tracking-tighter">{usedM}M</span>
                                        <span className="text-muted-foreground font-medium">/ {includedM}M included</span>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {percentUsed.toFixed(1)}% Usage
                                    </span>
                                </div>
                            </div>
                            
                            <div className="relative pt-2">
                                <Progress 
                                    value={percentUsed} 
                                    className="h-3 rounded-full bg-secondary/50 overflow-hidden" 
                                />
                                {/* Add a glow dot at the end of progress */}
                                <div 
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] transition-all duration-500 ease-in-out"
                                    style={{ left: `calc(${percentUsed}% - 8px)` }}
                                />
                            </div>
                            
                            {isOverage && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl text-sm flex items-start gap-3 mt-4"
                                >
                                    <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p>You have exceeded your included allowance. Overage is billed at standard usage rates to keep your services running seamlessly.</p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-6"
            >
                <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        Extensions & Add-ons
                    </h3>
                    <p className="text-muted-foreground mt-1">Supercharge your Starter plan with targeted AI capabilities.</p>
                </div>
                
                <BentoGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="gap-4">
                    {EXTENSIONS.map((ext, i) => (
                        <BentoGridItem 
                            key={i} 
                            span={ext.span}
                            className="bg-card/30 hover:bg-card/50 border-border/20 hover:border-border/40 transition-all duration-500"
                        >
                            <div className="flex flex-col h-full justify-between gap-6">
                                <div className="p-2 w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center border border-border/30 shadow-inner">
                                    {ext.icon}
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold mb-2">{ext.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{ext.description}</p>
                                </div>
                                <div className="pt-4 mt-auto">
                                    <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 hover:text-primary group">
                                        Enable Add-on
                                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </Button>
                                </div>
                            </div>
                        </BentoGridItem>
                    ))}
                </BentoGrid>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-16"
            >
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                    <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-1 md:p-1 overflow-hidden">
                        
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <ShieldCheck className="w-64 h-64" />
                        </div>

                        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                            <div className="space-y-4 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                                    <Users className="w-4 h-4" />
                                    For Teams &gt; 5 Members
                                </div>
                                <h3 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                    Upgrade to Enterprise
                                </h3>
                                <p className="text-lg text-muted-foreground/80 leading-relaxed">
                                    Unlock infinite scale, dedicated support, custom data connectors, and priority agent processing for your entire organization.
                                </p>
                                
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                    {["Unlimited Team Members", "Priority Support SLA", "Custom Ingestion Pipelines", "Dedicated Account Manager"].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="flex-shrink-0 w-full md:w-auto">
                                <HoverBorderGradient
                                    containerClassName="rounded-full w-full md:w-auto"
                                    as="button"
                                    className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-8 py-4 w-full md:w-auto justify-center text-lg font-semibold transition-transform hover:scale-105"
                                    onClick={() => startCheckoutByPlan('pro')}
                                >
                                    <span>Contact Sales to Upgrade</span>
                                    <Zap className="w-5 h-5 ml-2 text-yellow-500" />
                                </HoverBorderGradient>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

		</div>
	);
}
