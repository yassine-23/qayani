import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest } from '../../../lib/validation/schemas';
import { Errors } from '../../../lib/errors/types';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { z } from 'zod';

// Validation schemas
const createFamilyMemberSchema = z.object({
  name: z.string().min(1).max(255),
  dateOfBirth: z.string().date().optional(),
  dateOfPassing: z.string().date().optional(),
  relationshipToCreator: z.string().min(1).max(100),
  generation: z.number().int(),
  personalityId: z.string().uuid().optional(),
  avatarUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});

const updateFamilyMemberSchema = createFamilyMemberSchema.partial();

/**
 * GET /api/family
 * Get family tree for authenticated user
 */
async function getFamilyTreeHandler(request: NextRequest, userId: string) {
  try {
    // Get family members
    const { data: members, error } = await supabaseAdmin.rpc('get_family_tree', {
      p_user_id: userId,
    });

    if (error) {
      throw Errors.database('get family tree', error);
    }

    // Get family statistics
    const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_family_stats', {
      p_user_id: userId,
    });

    if (statsError) {
      console.error('Error getting family stats:', statsError);
    }

    return successResponse({
      members: members || [],
      stats: stats || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting family tree:', error);
    throw Errors.internalServer('get family tree', error);
  }
}

/**
 * POST /api/family
 * Create a new family member
 */
async function createFamilyMemberHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(createFamilyMemberSchema, body);

    const { data: member, error } = await supabaseAdmin
      .from('family_members')
      .insert({
        user_id: userId,
        name: validatedData.name,
        date_of_birth: validatedData.dateOfBirth || null,
        date_of_passing: validatedData.dateOfPassing || null,
        relationship_to_creator: validatedData.relationshipToCreator,
        generation: validatedData.generation,
        personality_id: validatedData.personalityId || null,
        avatar_url: validatedData.avatarUrl || null,
        notes: validatedData.notes || null,
        has_digital_twin: !!validatedData.personalityId,
      })
      .select()
      .single();

    if (error) {
      throw Errors.database('create family member', error);
    }

    return successResponse({
      member,
      message: 'Family member created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating family member:', error);
    throw Errors.internalServer('create family member', error);
  }
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getFamilyTreeHandler),
  { requests: 60, window: '1 m' }
);

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createFamilyMemberHandler),
  { requests: 30, window: '1 m' }
);
