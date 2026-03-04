"use client";
import { useEffect, useMemo, useState } from 'react';
import Glow from "@/components/ui/glow";
import PricingComparator from "@/components/pricing-comparator";
import PricingSection from "@/components/sections/pricing/default";
import { PricingColumnProps } from "@/components/ui/pricing-column";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PLATFORM_PLANS, PlanSlug } from "@/lib/pricing-constants";
import { Progress } from "@/components/ui/progress";

// Use plan slugs from constants
const PLAN_IDS = {
  starter: PLATFORM_PLANS.starter.slug,
  growth: PLATFORM_PLANS.growth.slug,
  pro: PLATFORM_PLANS.pro.slug,
};

// Map features to table data
const pricingTableData = [
	{
		feature: 'Included Tokens',
		starter: '1M / month',
		pro: '5M / month',
		enterprise: '20M / month',
	},
	{
		feature: 'Storage & Documents',
		starter: '50GB / Unlimited',
		pro: '200GB / Unlimited',
		enterprise: '500GB / Unlimited',
	},
	{
		feature: 'Client Page',
		starter: '1',
		pro: '3',
		enterprise: '5',
	},
	{
		feature: 'Document ingestion',
		starter: true,
		pro: true,
		enterprise: true,
	},
	{
		feature: 'Core connectors',
		starter: true,
		pro: true,
		enterprise: true,
	},
	{
		feature: 'Priority support',
		starter: false,
		pro: true,
		enterprise: true,
	},
	{
		feature: 'Custom onboarding',
		starter: false,
		pro: false,
		enterprise: true,
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
                if (sub) {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    const { data: usageData } = await supabase
                        .from('usage_allowances')
                        .select('*')
                        .eq('team_id', teamId)
                        .eq('period_start', startOfMonth)
                        .maybeSingle();
                    setUsage(usageData);
                }

			} catch (e) {
                console.error(e);
			}
		})();
	}, [supabase]);

	const startCheckoutByPlan = async (planSlug: string) => {
		setLoadingKey(planSlug);
		try {
            // Get current team ID
            const teamId = document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1];
            if (!teamId) return;

			const res = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
                    teamId,
                    planSlug: planSlug,
                    // For upgrading, we might need different logic or just new sub?
                    // Assuming this creates a NEW subscription or updates?
                    // The checkout API creates a NEW subscription session.
                    // If user already has one, Stripe might create duplicate or we should use Customer Portal.
                    // Ideally use Customer Portal for upgrades if sub exists.
                    // But for now, let's assume this is for new/resubscribe or handle manually.
                }),
			});
			const data = await res.json();
			if (data.url) window.location.href = data.url as string;
		} finally {
			setLoadingKey(null);
		}
	};
    
    // Redirect to Portal for existing subs
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

	return (
		<div className="relative p-6 space-y-8">
			<Glow variant="above" className='absolute top-0 left-0 -z-1' />
			<h1 className="text-2xl font-semibold">Billing & Usage</h1>

            {subscription && usage && (
                <div className="bg-card border rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-medium">Current Usage</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                         <div>
                             <p className="text-sm text-muted-foreground">Plan</p>
                             <p className="text-xl font-bold capitalize">{subscription.platform_subscriptions?.name || 'Unknown'}</p>
                         </div>
                         <div>
                             <p className="text-sm text-muted-foreground">Tokens Used</p>
                             <div className="flex items-end gap-2">
                                <p className="text-xl font-bold">
                                    {(usage.tokens_used / 1000000).toFixed(2)}M
                                </p>
                                <p className="text-sm text-muted-foreground mb-1">
                                    / {(usage.tokens_included / 1000000).toFixed(0)}M included
                                </p>
                             </div>
                             <Progress value={Math.min(100, (usage.tokens_used / usage.tokens_included) * 100)} className="h-2 mt-2" />
                         </div>
                    </div>
                    {usage.tokens_used > usage.tokens_included && (
                        <div className="bg-amber-500/10 text-amber-500 p-3 rounded text-sm">
                            You have exceeded your included allowance. Overage is billed at usage rates.
                        </div>
                    )}
                    <button 
                        onClick={handleManageSubscription}
                        disabled={loadingKey === 'portal'}
                        className="text-sm text-primary hover:underline"
                    >
                        {loadingKey === 'portal' ? 'Loading...' : 'Manage Subscription in Stripe'}
                    </button>
                </div>
            )}

            {!subscription && (
                <PricingComparator
                    tableData={pricingTableData}
                    onStarterClick={() => startCheckoutByPlan('starter')}
                    onProClick={() => startCheckoutByPlan('growth')} 
                    onEnterpriseClick={() => startCheckoutByPlan('pro')} 
                    // PricingComparator expects onEnterpriseClick. 
                    // Our plans are Starter, Growth, Pro. 
                    // Let's assume Comparator columns are Starter, Pro, Enterprise visually?
                    // Actually, let's map: Starter->Starter, Growth->Pro (Middle), Pro->Enterprise (Right)?
                    // Or update Comparator to be generic. 
                    // For quick fix:
                    // Left: Starter
                    // Middle: Growth
                    // Right: Pro
                    loadingKey={loadingKey}
                />
            )}
		</div>
	);
}
