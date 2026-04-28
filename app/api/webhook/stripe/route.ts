import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Checkout session completed:', session.id);

      // Here you would typically:
      // 1. Create user account if it doesn't exist
      // 2. Update user subscription status
      // 3. Grant access to premium features
      // 4. Send welcome email

      await handleCheckoutSessionCompleted(session);
      break;

    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription;
      console.log('✅ Subscription created:', subscription.id);

      await handleSubscriptionCreated(subscription);
      break;

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      console.log('✅ Subscription updated:', updatedSubscription.id);

      await handleSubscriptionUpdated(updatedSubscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log('❌ Subscription canceled:', deletedSubscription.id);

      await handleSubscriptionDeleted(deletedSubscription);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      console.log('💰 Payment succeeded:', invoice.id);

      await handleInvoicePaymentSucceeded(invoice);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      console.log('💸 Payment failed:', failedInvoice.id);

      await handleInvoicePaymentFailed(failedInvoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Extract metadata
    const { tierId, billingPeriod } = session.metadata || {};
    const customerEmail = session.customer_details?.email;
    const customerId = session.customer as string;

    console.log('Processing checkout completion:', {
      sessionId: session.id,
      tierId,
      billingPeriod,
      customerEmail,
      customerId
    });

    // TODO: Implement user account creation and subscription management
    // This would typically involve:
    // 1. Creating or updating user in Supabase
    // 2. Storing subscription details
    // 3. Granting premium access
    // 4. Sending welcome email

    // Example implementation:
    // await createOrUpdateUser({
    //   email: customerEmail,
    //   stripeCustomerId: customerId,
    //   subscriptionTier: tierId,
    //   billingPeriod: billingPeriod
    // });

  } catch (error) {
    console.error('Error handling checkout session completion:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const { tierId } = subscription.metadata || {};

    console.log('Processing subscription creation:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      tierId
    });

    // TODO: Update user subscription status in database

  } catch (error) {
    console.error('Error handling subscription creation:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing subscription update:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    });

    // TODO: Update user subscription status in database

  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('Processing subscription deletion:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });

    // TODO: Remove premium access, handle cancellation

  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Processing successful payment:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid
    });

    // TODO: Update payment history, send receipt

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Processing failed payment:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      attemptCount: invoice.attempt_count
    });

    // TODO: Handle failed payment, send notification, potential account suspension

  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}