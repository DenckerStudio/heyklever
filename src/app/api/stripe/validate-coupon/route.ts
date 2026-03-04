import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-09-30.clover',
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { couponCode } = body;

        if (!couponCode || typeof couponCode !== 'string') {
            return NextResponse.json({ 
                valid: false, 
                error: 'Coupon code is required' 
            }, { status: 400 });
        }

        try {
            // Retrieve the coupon from Stripe
            const coupon = await stripe.coupons.retrieve(couponCode.trim(), {
                expand: ['applies_to']
            });

            // Check if coupon is valid
            if (!coupon.valid) {
                return NextResponse.json({ 
                    valid: false, 
                    error: 'This coupon code is no longer valid' 
                });
            }

            // Check if coupon is applicable to subscriptions
            const validForSubscriptions = 
                coupon.duration === 'forever' || 
                coupon.duration === 'repeating' || 
                coupon.duration === 'once';

            if (!validForSubscriptions) {
                return NextResponse.json({ 
                    valid: false, 
                    error: 'This coupon cannot be applied to subscriptions' 
                });
            }

            // Return coupon details
            return NextResponse.json({
                valid: true,
                coupon: {
                    id: coupon.id,
                    name: coupon.name,
                    percent_off: coupon.percent_off,
                    amount_off: coupon.amount_off,
                    currency: coupon.currency,
                    duration: coupon.duration,
                }
            });

        } catch (error: any) {
            // Coupon not found or invalid
            if (error.code === 'resource_missing') {
                return NextResponse.json({ 
                    valid: false, 
                    error: 'Coupon code not found' 
                });
            }

            return NextResponse.json({ 
                valid: false, 
                error: 'Invalid coupon code' 
            });
        }

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
        console.error("Coupon validation error:", err);
        return NextResponse.json({ 
            valid: false, 
            error: errorMessage 
        }, { status: 500 });
    }
}

