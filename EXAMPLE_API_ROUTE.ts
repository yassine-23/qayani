/**
 * EXAMPLE API ROUTE - Shows how to use all backend infrastructure
 * Copy this pattern for all your API routes
 */

import { NextRequest } from 'next/server';
import { withAuthErrorHandling, successResponse, paginatedResponse } from '@/lib/errors/handler';
import { validateRequest, createMemorySchema, paginationSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/logging/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Errors } from '@/lib/errors/types';

// =====================================================
// POST /api/memories - Create a new memory
// =====================================================

export const POST = withAuthErrorHandling(async (request: NextRequest, userId: string) => {
  // 1. Set logging context
  logger.setContext({
    userId,
    endpoint: 'POST /api/memories',
  });

  // 2. Parse and validate request body
  const body = await request.json();
  const data = validateRequest(createMemorySchema, body);

  logger.info('Creating memory', {
    memoryType: data.memoryType,
    contentLength: data.content.length,
  });

  // 3. Business logic - Insert into database
  const { data: memory, error } = await supabaseAdmin
    .from('user_memories')
    .insert({
      user_id: userId,
      content: data.content,
      title: data.title,
      memory_type: data.memoryType,
      source_file_url: data.sourceFileUrl,
      emotion_tags: data.emotionTags,
      topics: data.topics,
      date_mentioned: data.dateMentioned,
      importance_score: data.importanceScore,
      metadata: data.metadata,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create memory', error);
    throw Errors.database('insert memory', error);
  }

  logger.info('Memory created successfully', { memoryId: memory.id });

  // 4. Return success response
  return successResponse(memory, 201, 'Memory created successfully');
});

// =====================================================
// GET /api/memories - List user memories (with pagination)
// =====================================================

export const GET = withAuthErrorHandling(async (request: NextRequest, userId: string) => {
  logger.setContext({
    userId,
    endpoint: 'GET /api/memories',
  });

  // 1. Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = {
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '20',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  };

  // 2. Validate pagination params
  const pagination = validateRequest(paginationSchema, queryParams);

  logger.info('Fetching memories', pagination);

  // 3. Calculate offset for pagination
  const offset = (pagination.page - 1) * pagination.pageSize;

  // 4. Fetch memories from database
  const { data: memories, error, count } = await supabaseAdmin
    .from('user_memories')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order(pagination.sortBy || 'created_at', { ascending: pagination.sortOrder === 'asc' })
    .range(offset, offset + pagination.pageSize - 1);

  if (error) {
    logger.error('Failed to fetch memories', error);
    throw Errors.database('fetch memories', error);
  }

  // 5. Calculate pagination metadata
  const total = count || 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  logger.info('Memories fetched successfully', {
    count: memories?.length || 0,
    total,
  });

  // 6. Return paginated response
  return paginatedResponse(memories || [], {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages,
  });
});

// =====================================================
// EXAMPLE: File Upload Route with Validation
// =====================================================

import { validateFile, throwIfInvalid, generateSafeFilename } from '@/lib/upload/validator';
import { uploadFile } from '@/lib/upload/supabase';

export const POST_WITH_FILE = withAuthErrorHandling(async (request: NextRequest, userId: string) => {
  logger.setContext({
    userId,
    endpoint: 'POST /api/recordings/upload',
  });

  // 1. Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const personalityId = formData.get('personalityId') as string;

  if (!file) {
    throw Errors.missingField('file');
  }

  if (!personalityId) {
    throw Errors.missingField('personalityId');
  }

  logger.info('File upload started', {
    filename: file.name,
    size: file.size,
    type: file.type,
  });

  // 2. Validate file
  const validation = await validateFile(file, 'audio');
  throwIfInvalid(validation);

  logger.info('File validated', validation.fileInfo);

  // 3. Check user owns personality
  const { data: personality } = await supabaseAdmin
    .from('personalities')
    .select('user_id')
    .eq('id', personalityId)
    .single();

  if (!personality) {
    throw Errors.notFound('Personality', personalityId);
  }

  if (personality.user_id !== userId) {
    throw Errors.forbidden('You do not own this personality');
  }

  // 4. Generate safe filename
  const safeFilename = generateSafeFilename(file.name);

  // 5. Upload to storage
  const uploadResult = await uploadFile(file, {
    bucket: 'recordings',
    folder: `${userId}/recordings`,
    filename: safeFilename,
  });

  logger.info('File uploaded successfully', {
    path: uploadResult.path,
    size: uploadResult.size,
  });

  // 6. Create database record
  const { data: recording, error } = await supabaseAdmin
    .from('recordings')
    .insert({
      user_id: userId,
      personality_id: personalityId,
      file_url: uploadResult.url,
      file_size: uploadResult.size,
      processing_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw Errors.database('create recording', error);
  }

  logger.info('Recording created', { recordingId: recording.id });

  // 7. Return success
  return successResponse(
    {
      recording,
      fileInfo: validation.fileInfo,
    },
    201,
    'Recording uploaded successfully'
  );
});

// =====================================================
// EXAMPLE: Route with Permission Check
// =====================================================

import { requireSubscriptionTier } from '@/lib/middleware/auth';

export const POST_PREMIUM_FEATURE = withAuthErrorHandling(async (request: NextRequest, userId: string) => {
  logger.setContext({
    userId,
    endpoint: 'POST /api/voice/train',
  });

  // 1. Check subscription tier
  await requireSubscriptionTier(request, 'premium');

  logger.info('Premium feature accessed', { userId });

  // 2. Your premium feature logic here
  // ...

  return successResponse({ message: 'Premium feature activated' });
});

// =====================================================
// EXAMPLE: Public Route (No Authentication)
// =====================================================

import { withErrorHandling } from '@/lib/errors/handler';

export const GET_PUBLIC = withErrorHandling(async (request: NextRequest) => {
  logger.setContext({
    endpoint: 'GET /api/public/stats',
  });

  // Fetch public data
  const { data: stats } = await supabaseAdmin
    .from('public_stats')
    .select('*')
    .single();

  return successResponse(stats || {});
});

// =====================================================
// SUMMARY OF PATTERNS
// =====================================================

/*

1. AUTHENTICATED ROUTE:
   - Use: withAuthErrorHandling(async (request, userId) => {...})
   - Automatically validates JWT token
   - Provides userId
   - Handles all errors

2. VALIDATION:
   - Use: validateRequest(schema, data)
   - Throws validation error automatically
   - Type-safe with TypeScript

3. DATABASE QUERIES:
   - Always check for errors
   - Throw Errors.database() on failure
   - Log query results

4. FILE UPLOADS:
   - Validate with validateFile()
   - Use throwIfInvalid(validation)
   - Generate safe filenames
   - Upload to Supabase Storage

5. LOGGING:
   - Set context at start
   - Log important steps
   - Log errors with context

6. RESPONSES:
   - Use successResponse(data) for success
   - Use paginatedResponse(data, pagination) for lists
   - Errors handled automatically

*/
