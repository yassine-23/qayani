import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { Errors } from '../../../lib/errors/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

async function createCheckoutSessionHandler(request: NextRequest, userId: string) {
  const { priceId, billingPeriod, tierId } = await request.json();

  if (!priceId) {
    throw Errors.missingField('priceId');
  }

  // Get user email from Supabase
  const { data: user, error: userError } = await (await import('../../../lib/supabase/admin')).supabaseAdmin.auth.getUser();

  // Create Stripe checkout session
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: user?.user?.email,
      client_reference_id: userId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId,
        tierId,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId,
          tierId,
          billingPeriod,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      automatic_tax: {
        enabled: true,
      },
    });

    return successResponse({ url: session.url });
  } catch (error: any) {
    throw Errors.externalService('Stripe', error);
  }
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createCheckoutSessionHandler),
  { requests: 5, window: '1 m' }
);