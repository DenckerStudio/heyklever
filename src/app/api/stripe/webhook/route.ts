import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-09-30.clover' as Stripe.LatestApiVersion,
});

export async function POST(req: NextRequest) {
	const secret = process.env.STRIPE_WEBHOOK_SECRET as string;
	const payload = await req.text();
	const signature = req.headers.get('stripe-signature') as string;
	let event: Stripe.Event;
	
	try {
		event = stripe.webhooks.constructEvent(payload, signature, secret);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('Webhook signature verification failed:', message);
		return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
	}

	console.log(`Received Stripe webhook event: ${event.type} (ID: ${event.id})`);

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const metadata = session.metadata || {};
			const teamId = metadata.teamId;
            const planSlug = metadata.planSlug; // New field
			const _addonIds = metadata.addonIds ? metadata.addonIds.split(',').filter(Boolean) : [];
            const _addonSlugs = metadata.addonSlugs ? metadata.addonSlugs.split(',').filter(Boolean) : [];

			if (!teamId || !planSlug) {
				console.error(`Missing required metadata in checkout.session.completed: teamId or planSlug`);
				return NextResponse.json({ error: `Missing required metadata` }, { status: 400 });
			}

            // Get Platform Subscription ID
            const { data: platformSub } = await supabaseAdmin
                .from('platform_subscriptions')
                .select('id, included_tokens')
                .eq('slug', planSlug)
                .single();

            if (!platformSub) {
                console.error(`Platform subscription not found for slug: ${planSlug}`);
                // Proceed, but without linking (critical error actually)
            }

			// Store subscription details
			const customerId = session.customer as string;
			const subscriptionId = session.subscription as string;
			
			if (subscriptionId && customerId) {
				try {
					const subscription = await stripe.subscriptions.retrieve(subscriptionId);
					// Access properties safely - these properties exist on Stripe.Subscription
					const currentPeriodEnd = 'current_period_end' in subscription ? subscription.current_period_end : null;
					const currentPeriodStart = 'current_period_start' in subscription ? subscription.current_period_start : null;
					
					// Validate timestamps before converting
					if (currentPeriodStart && currentPeriodEnd && 
						typeof currentPeriodStart === 'number' && 
						typeof currentPeriodEnd === 'number') {
					
					await supabaseAdmin
						.from('subscriptions')
						.upsert({
							id: subscriptionId,
							team_id: teamId,
							customer_id: customerId,
							status: 'active',
                            platform_subscription_id: platformSub?.id,
                            current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
							current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
						}, { onConflict: 'id' });
					console.log(`Stored subscription ${subscriptionId} for team ${teamId}`);

                    // Initialize Usage Allowance
                    if (platformSub) {
                         // Align with Stripe period
                         const periodStart = new Date(currentPeriodStart * 1000);
                         const periodEnd = new Date(currentPeriodEnd * 1000);
                         
                         await supabaseAdmin
                            .from('usage_allowances')
                            .upsert({
                                team_id: teamId,
                                subscription_plan_slug: planSlug,
                                period_start: periodStart.toISOString(),
                                period_end: periodEnd.toISOString(),
                                tokens_used: 0,
                                tokens_included: platformSub.included_tokens
                            }, { onConflict: 'team_id,period_start,period_end' });
						}
					} else {
						console.warn(`Invalid timestamp values for subscription ${subscriptionId}: start=${currentPeriodStart}, end=${currentPeriodEnd}`);
                    }

				} catch (subError: unknown) {
					const errorMessage = subError instanceof Error ? subError.message : 'Unknown error';
					console.error('Failed to store subscription:', errorMessage);
				}
			}

			// Store subscription items
			if (subscriptionId) {
				try {
					const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
						expand: ['items.data.price.product'],
					});

					// Fetch all addons to map IDs/Slugs
                    const { data: allAddons } = await supabaseAdmin.from('addons').select('*');
                    
                    const addons = allAddons || [];
                    
                    for (const item of subscription.items.data) {
                        const priceId = item.price.id;
                        const product = item.price.product as Stripe.Product;
                        const productName = product.name;
                        
                        // Find addon by exact Stripe Price ID match (for single-meter addons)
                        let matchedAddon = addons.find(a => a.stripe_price_id === priceId);
                        
                        // Fallback: Find by Product Name (for multi-meter RAG AI)
                        if (!matchedAddon && productName) {
                             matchedAddon = addons.find(a => a.name === productName);
                        }

                        if (matchedAddon) {
                            await supabaseAdmin
                                .from('subscription_items')
                                .upsert({
                                    subscription_id: subscriptionId,
                                    team_id: teamId,
                                    addon_id: matchedAddon.id,
                                    stripe_subscription_item_id: item.id,
                                    stripe_price_id: priceId,
                                    addon_slug: matchedAddon.slug,
                                }, {
                                    onConflict: 'stripe_subscription_item_id',
                                });
                             // Activate addon
                             await supabaseAdmin.from('team_addons').upsert({
                                 team_id: teamId,
                                 addon_id: matchedAddon.id,
                                 status: 'active'
                             }, { onConflict: 'team_id,addon_id' });
                        }
                    }

				} catch (itemError: unknown) {
					const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error';
					console.error('Failed to store subscription items:', errorMessage);
				}
			}

			// Notify external n8n webhook for container setup
			// After n8n creates the container and stores data in n8n_instances table,
			// n8n should call back to /api/n8n/setup-admin to create the admin account
			console.log(`Notifying n8n webhook for team ${teamId}`);
            
            // Get team details
			const { data: team } = await supabaseAdmin.from('teams').select('slug, name').eq('id', teamId).single();
			
            if (team) {
				const baseUrl = process.env.N8N_SETUP_CLIENT_CONTAINER || 'https://n8n.dencker.no/webhook/setup_client_container';
				
				// Build URL with query parameters for GET request
				const url = new URL(baseUrl);
				url.searchParams.set('team_id', teamId);
				url.searchParams.set('plan', planSlug);
				url.searchParams.set('teamSlug', team.slug);
				url.searchParams.set('teamName', team.name);
				if (_addonSlugs.length > 0) {
					url.searchParams.set('addonSlugs', _addonSlugs.join(','));
				}
				
				// Add callback URL for n8n to call after container setup
				const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/n8n/setup-admin`;
				url.searchParams.set('callbackUrl', callbackUrl);
				
				const n8nWebhookUrl = url.toString();
				
				console.log(`Calling n8n webhook at: ${n8nWebhookUrl}`);
				console.log(`Query params:`, {
					team_id: teamId,
					plan: planSlug,
					teamSlug: team.slug,
					teamName: team.name,
					addonSlugs: _addonSlugs,
				});
				
				try {
					const webhookResponse = await fetch(n8nWebhookUrl, {
						method: 'GET',
					});

					if (!webhookResponse.ok) {
						const errorText = await webhookResponse.text().catch(() => 'Unable to read response body');
						console.error(`n8n webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
						console.error(`URL called: ${n8nWebhookUrl}`);
						console.error(`Response body: ${errorText}`);
						// Don't fail the webhook if n8n is down - payment is already processed
						console.warn('Continuing despite n8n webhook failure - payment was successful');
                 } else {
						const responseText = await webhookResponse.text().catch(() => 'Unable to read response body');
						console.log(`Successfully notified n8n webhook for team ${teamId}`);
						console.log(`Response: ${responseText}`);
						
                      // Mark onboarding completed
						const { data: members } = await supabaseAdmin
							.from('team_members')
							.select('user_id')
							.eq('team_id', teamId)
							.eq('role', 'owner')
							.single();
						
                        if (members) {
							await supabaseAdmin
								.from('profiles')
								.update({ onboarding_completed: true })
								.eq('id', members.user_id);
                        }
                 }
				} catch (webhookError: unknown) {
					const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
					console.error(`Failed to notify n8n webhook: ${errorMessage}`);
					console.error(`URL attempted: ${n8nWebhookUrl}`);
					if (webhookError instanceof Error && 'cause' in webhookError) {
						console.error('Error cause:', webhookError.cause);
					}
					// Don't fail the webhook - payment is verified, container setup can be retried
					console.warn('Continuing despite n8n webhook error - payment was successful');
				}
			} else {
				console.error(`Team not found for teamId: ${teamId}`);
            }

			break;
		}
        // Handle renewal/updates
		case 'customer.subscription.updated': {
			const subscription = event.data.object as Stripe.Subscription;
			const metadata = subscription.metadata || {};
			const teamId = metadata.teamId;
            const planSlug = metadata.planSlug; // Check if we have it in metadata (should persist from creation)
			
			if (teamId) {
                // Update subscription
				const periodStart = 'current_period_start' in subscription ? subscription.current_period_start : null;
				const periodEnd = 'current_period_end' in subscription ? subscription.current_period_end : null;
				
				// Validate timestamps before converting
				if (periodStart && periodEnd && 
					typeof periodStart === 'number' && 
					typeof periodEnd === 'number') {
					
				await supabaseAdmin
					.from('subscriptions')
					.upsert({
						id: subscription.id,
						team_id: teamId,
						customer_id: subscription.customer as string,
						status: subscription.status,
							current_period_start: new Date(periodStart * 1000).toISOString(),
							current_period_end: new Date(periodEnd * 1000).toISOString(),
					}, { onConflict: 'id' });
                
                // If new period started, ensure allowance is reset/created
                if (planSlug) {
						const periodStartDate = new Date(periodStart * 1000);
						const periodEndDate = new Date(periodEnd * 1000);
                    
                    const { data: platformSub } = await supabaseAdmin
                        .from('platform_subscriptions')
                        .select('included_tokens')
                        .eq('slug', planSlug)
                        .single();
                        
                    if (platformSub) {
                         await supabaseAdmin
                            .from('usage_allowances')
                            .upsert({
                                team_id: teamId,
                                subscription_plan_slug: planSlug,
									period_start: periodStartDate.toISOString(),
									period_end: periodEndDate.toISOString(),
                                tokens_used: 0, // Reset for new period
                                tokens_included: platformSub.included_tokens
                            }, { onConflict: 'team_id,period_start,period_end' });
                    }
					}
				} else {
					console.warn(`Invalid timestamp values for subscription ${subscription.id}: start=${periodStart}, end=${periodEnd}`);
                }
			}
			break;
		}
        case 'customer.subscription.deleted': {
            // ... (keep existing logic)
             const subscription = event.data.object as Stripe.Subscription;
             if (subscription.metadata?.teamId) {
                 await supabaseAdmin.from('subscriptions').update({ status: 'canceled' }).eq('id', subscription.id);
             }
             break;
        }
		default:
			console.log(`Unhandled webhook event type: ${event.type}`);
	}

	return NextResponse.json({ received: true });
}
