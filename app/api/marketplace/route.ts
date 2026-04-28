import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest } from '../../../lib/validation/schemas';
import { Errors } from '../../../lib/errors/types';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { z } from 'zod';

// Validation schemas
const createListingSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(['realistic', 'cartoon', 'anime', 'fantasy', 'sci-fi', 'celebrity']),
  tags: z.array(z.string()).max(10).optional(),
  listingType: z.enum(['sale', 'rent', 'both']),
  salePrice: z.number().positive().optional(),
  rentPriceHourly: z.number().positive().optional(),
  rentPriceDaily: z.number().positive().optional(),
  rentPriceMonthly: z.number().positive().optional(),
  avatarUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  previewImages: z.array(z.string().url()).max(5).optional(),
  customizationOptions: z.record(z.any()).optional(),
});

const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sortBy: z.enum(['popular', 'newest', 'price_low', 'price_high', 'rating']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

/**
 * GET /api/marketplace
 * Search and browse avatar marketplace
 */
async function getMarketplaceHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || null;
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const sortBy = searchParams.get('sortBy') || 'popular';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const featured = searchParams.get('featured') === 'true';

    if (featured) {
      // Get featured avatars
      const { data: avatars, error } = await supabaseAdmin.rpc('get_featured_avatars', {
        p_limit: limit,
      });

      if (error) {
        throw Errors.database('get featured avatars', error);
      }

      return successResponse({
        avatars: avatars || [],
        count: avatars?.length || 0,
        featured: true,
      });
    }

    // Search avatars
    const { data: avatars, error } = await supabaseAdmin.rpc('search_avatars', {
      p_search_query: query,
      p_category: category,
      p_min_price: minPrice,
      p_max_price: maxPrice,
      p_sort_by: sortBy,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw Errors.database('search avatars', error);
    }

    return successResponse({
      avatars: avatars || [],
      count: avatars?.length || 0,
      query,
      category,
      sortBy,
    });
  } catch (error) {
    console.error('Error getting marketplace listings:', error);
    throw Errors.internalServer('get marketplace', error);
  }
}

/**
 * POST /api/marketplace
 * Create a new avatar listing
 */
async function createListingHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(createListingSchema, body);

    // Validate pricing based on listing type
    if (validatedData.listingType === 'sale' && !validatedData.salePrice) {
      throw Errors.badRequest('Sale price required for sale listings');
    }

    if (
      validatedData.listingType === 'rent' &&
      !validatedData.rentPriceHourly &&
      !validatedData.rentPriceDaily &&
      !validatedData.rentPriceMonthly
    ) {
      throw Errors.badRequest('At least one rental price required for rental listings');
    }

    if (
      validatedData.listingType === 'both' &&
      !validatedData.salePrice &&
      (!validatedData.rentPriceHourly || !validatedData.rentPriceDaily || !validatedData.rentPriceMonthly)
    ) {
      throw Errors.badRequest('Both sale and rental pricing required for both listing type');
    }

    const { data: listing, error } = await supabaseAdmin
      .from('avatar_marketplace')
      .insert({
        creator_id: userId,
        title: validatedData.title,
        description: validatedData.description || null,
        category: validatedData.category,
        tags: validatedData.tags || [],
        listing_type: validatedData.listingType,
        sale_price: validatedData.salePrice || null,
        rent_price_hourly: validatedData.rentPriceHourly || null,
        rent_price_daily: validatedData.rentPriceDaily || null,
        rent_price_monthly: validatedData.rentPriceMonthly || null,
        avatar_url: validatedData.avatarUrl,
        thumbnail_url: validatedData.thumbnailUrl || null,
        preview_images: validatedData.previewImages || [],
        customization_options: validatedData.customizationOptions || {},
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw Errors.database('create listing', error);
    }

    return successResponse({
      listing,
      message: 'Avatar listing created successfully',
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    throw Errors.internalServer('create listing', error);
  }
}

export const GET = withRateLimitAndErrorHandling(
  async (request: NextRequest) => getMarketplaceHandler(request),
  { requests: 60, window: '1 m' }
);

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createListingHandler),
  { requests: 10, window: '1 m' }
);
