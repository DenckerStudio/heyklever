#!/bin/bash
# Quick script to test Stripe webhook with Stripe CLI
# 
# Usage:
#   ./scripts/test-stripe-webhook.sh [event-type]
#
# Examples:
#   ./scripts/test-stripe-webhook.sh checkout.session.completed
#   ./scripts/test-stripe-webhook.sh invoice.payment_succeeded

EVENT_TYPE=${1:-checkout.session.completed}

echo "📡 Triggering Stripe webhook event: $EVENT_TYPE"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed"
    echo "   Install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Trigger the event
stripe trigger "$EVENT_TYPE"

echo ""
echo "✅ Event triggered! Check your webhook logs."

