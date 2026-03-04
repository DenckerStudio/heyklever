# Stripe Webhook Events Configuration

This document outlines the Stripe webhook events that need to be configured in your Stripe Dashboard for the VPS provisioning system to work correctly.

## Required Webhook Events

Configure the following events in your Stripe Dashboard → Developers → Webhooks:

### 1. `checkout.session.completed`
**Purpose**: Triggered when a customer successfully completes checkout.

**Actions**:
- Store subscription details in database
- Store subscription items for usage-based billing
- Activate addons (including required RAG AI)
- **Trigger VPS provisioning via Hostinger API**
- Mark user onboarding as completed

**Critical**: This is the main event that triggers VPS purchase from Hostinger.

### 2. `customer.subscription.created`
**Purpose**: Triggered when a new subscription is created.

**Actions**:
- Store/update subscription in database
- Update subscription items

### 3. `customer.subscription.updated`
**Purpose**: Triggered when a subscription is updated (plan change, addon added/removed, etc.).

**Actions**:
- Update subscription status and period end
- Update subscription items (for addon changes)

### 4. `customer.subscription.deleted`
**Purpose**: Triggered when a subscription is canceled or deleted.

**Actions**:
- Mark subscription as canceled in database
- Optionally: Suspend or stop VPS (future enhancement)

### 5. `invoice.payment_succeeded`
**Purpose**: Triggered when an invoice payment succeeds (recurring billing).

**Actions**:
- Update subscription status to active
- Update subscription period end date

### 6. `invoice.payment_failed`
**Purpose**: Triggered when an invoice payment fails.

**Actions**:
- Update subscription status (may be `past_due`, `unpaid`, etc.)
- Log payment failure for monitoring
- Optionally: Send notification to user or suspend VPS (future enhancement)

### 7. `invoice.created`
**Purpose**: Triggered when an invoice is created (for tracking/logging).

**Actions**:
- Log invoice creation for monitoring and analytics

## Webhook Endpoint Configuration

### Endpoint URL
```
https://your-domain.com/api/stripe/webhook
```

### Environment Variable
Make sure to set `STRIPE_WEBHOOK_SECRET` in your `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

## Setup Instructions

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Click "Add endpoint"**
3. **Enter your endpoint URL**: `https://your-domain.com/api/stripe/webhook`
4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.created`
5. **Copy the webhook signing secret** and add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`
6. **Test the webhook** using Stripe's webhook testing tool

## VPS Provisioning Flow

When `checkout.session.completed` is received:

1. **Validate metadata** (teamId, planId, location)
2. **Check for existing VPS** (idempotency check)
3. **Store subscription** in database
4. **Store subscription items** for usage-based billing
5. **Activate addons** (including required RAG AI)
6. **Call Hostinger API** to purchase VPS:
   - Uses `provisionVPS()` function
   - Creates VPS with selected plan and location
   - Enables backups if Daily Auto Backups addon is selected
7. **Create VPS instance record** in database
8. **Mark onboarding as completed**

## Error Handling

The webhook is designed to:
- **Never fail the webhook** - Always return 200 OK to Stripe
- **Log errors** for debugging
- **Continue processing** even if non-critical steps fail
- **Update VPS status** to 'error' if provisioning fails

This ensures Stripe doesn't retry the webhook indefinitely and allows manual intervention if needed.

## Testing

### Test Mode
Use Stripe's webhook testing tool in the Dashboard to send test events.

### Test Events
1. Create a test checkout session
2. Complete the checkout
3. Verify webhook is received
4. Check database for subscription and VPS instance
5. Verify VPS is created in Hostinger

## Monitoring

Monitor webhook events in:
- **Stripe Dashboard** → Developers → Webhooks → [Your Endpoint] → Events
- **Application logs** for webhook processing
- **Database** for subscription and VPS instance status

## Troubleshooting

### Webhook Not Received
- Verify endpoint URL is accessible
- Check webhook signing secret matches
- Ensure events are selected in Stripe Dashboard
- Check server logs for errors

### VPS Not Provisioned
- Check webhook logs for errors
- Verify Hostinger API key is valid
- Check Hostinger account has sufficient balance
- Verify VPS instance record in database
- Check VPS status in database (may be 'error')

### Subscription Not Stored
- Check webhook logs for database errors
- Verify Supabase connection
- Check RLS policies allow service role access

