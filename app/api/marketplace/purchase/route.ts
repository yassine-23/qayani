import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { z } from 'zod';

const purchaseSchema = z.object({
  listingId: z.string().uuid(),
  paymentIntentId: z.string(),
});

const rentalSchema = z.object({
  listingId: z.string().uuid(),
  durationType: z.enum(['hourly', 'daily', 'monthly']),
  duration: z.number().positive(),
  paymentIntentId: z.string(),
});

/**
 * POST /api/marketplace/purchase
 * Purchase an avatar
 */
async function purchaseAvatarHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(purchaseSchema, body);

    // Get listing details
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('avatar_marketplace')
      .select('*')
      .eq('id', validatedData.listingId)
      .single();

    if (listingError || !listing) {
      throw Errors.notFound('Avatar listing not found');
    }

    if (listing.status !== 'active') {
      throw Errors.badRequest('Avatar is no longer available');
    }

    if (!listing.sale_price) {
      throw Errors.badRequest('Avatar is not available for purchase');
    }

    // Check if user already owns this avatar
    const { data: existingOwnership } = await supabaseAdmin
      .from('user_avatar_inventory')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', validatedData.listingId)
      .eq('ownership_type', 'purchased')
      .single();

    if (existingOwnership) {
      throw Errors.badRequest('You already own this avatar');
    }

    // Process purchase using database function
    const { data: transactionId, error: purchaseError } = await supabaseAdmin.rpc(
      'process_avatar_purchase',
      {
        p_buyer_id: userId,
        p_listing_id: validatedData.listingId,
        p_amount: listing.sale_price,
        p_payment_intent_id: validatedData.paymentIntentId,
      }
    );

    if (purchaseError) {
      throw Errors.database('process purchase', purchaseError);
    }

    return successResponse({
      transactionId,
      message: 'Avatar purchased successfully',
      avatar: {
        id: listing.id,
        title: listing.title,
        avatarUrl: listing.avatar_url,
      },
    });
  } catch (error) {
    console.error('Error purchasing avatar:', error);
    throw Errors.internalServer('purchase avatar', error);
  }
}

/**
 * POST /api/marketplace/rent
 * Rent an avatar
 */
async function rentAvatarHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(rentalSchema, body);

    // Get listing details
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('avatar_marketplace')
      .select('*')
      .eq('id', validatedData.listingId)
      .single();

    if (listingError || !listing) {
      throw Errors.notFound('Avatar listing not found');
    }

    if (listing.status !== 'active' && listing.status !== 'rented') {
      throw Errors.badRequest('Avatar is not available for rent');
    }

    // Calculate rental price
    let rentalPrice = 0;
    let rentalDays = 0;

    if (validatedData.durationType === 'hourly') {
      if (!listing.rent_price_hourly) {
        throw Errors.badRequest('Hourly rental not available for this avatar');
      }
      rentalPrice = listing.rent_price_hourly * validatedData.duration;
      rentalDays = Math.ceil(validatedData.duration / 24);
    } else if (validatedData.durationType === 'daily') {
      if (!listing.rent_price_daily) {
        throw Errors.badRequest('Daily rental not available for this avatar');
      }
      rentalPrice = listing.rent_price_daily * validatedData.duration;
      rentalDays = validatedData.duration;
    } else if (validatedData.durationType === 'monthly') {
      if (!listing.rent_price_monthly) {
        throw Errors.badRequest('Monthly rental not available for this avatar');
      }
      rentalPrice = listing.rent_price_monthly * validatedData.duration;
      rentalDays = validatedData.duration * 30;
    }

    // Check if user already has an active rental for this avatar
    const { data: existingRental } = await supabaseAdmin
      .from('user_avatar_inventory')
      .select('id, rental_expires_at')
      .eq('user_id', userId)
      .eq('listing_id', validatedData.listingId)
      .eq('ownership_type', 'rented')
      .eq('is_active', true)
      .single();

    if (existingRental && existingRental.rental_expires_at) {
      const expiresAt = new Date(existingRental.rental_expires_at);
      if (expiresAt > new Date()) {
        throw Errors.badRequest('You already have an active rental for this avatar');
      }
    }

    // Process rental using database function
    const { data: transactionId, error: rentalError } = await supabaseAdmin.rpc(
      'process_avatar_rental',
      {
        p_buyer_id: userId,
        p_listing_id: validatedData.listingId,
        p_amount: rentalPrice,
        p_rental_duration_type: validatedData.durationType,
        p_rental_days: rentalDays,
        p_payment_intent_id: validatedData.paymentIntentId,
      }
    );

    if (rentalError) {
      throw Errors.database('process rental', rentalError);
    }

    return successResponse({
      transactionId,
      message: 'Avatar rented successfully',
      rental: {
        avatarId: listing.id,
        title: listing.title,
        avatarUrl: listing.avatar_url,
        durationType: validatedData.durationType,
        duration: validatedData.duration,
        expiresIn: `${rentalDays} days`,
      },
    });
  } catch (error) {
    console.error('Error renting avatar:', error);
    throw Errors.internalServer('rent avatar', error);
  }
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(async (request: NextRequest, userId: string) => {
    const { pathname } = new URL(request.url);
    if (pathname.endsWith('/rent')) {
      return rentAvatarHandler(request, userId);
    }
    return purchaseAvatarHandler(request, userId);
  }),
  { requests: 10, window: '1 m' }
);
