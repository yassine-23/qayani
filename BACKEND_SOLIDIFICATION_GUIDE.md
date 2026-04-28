# 🏗 Backend Solidification Guide
## Making QAYANI Rock-Solid & Production-Ready

**Focus:** Phase 1 - Backend Reliability
**Timeline:** 2-3 weeks
**Goal:** Bulletproof infrastructure that users can trust

---

## 🎯 Overview

This guide provides step-by-step instructions for solidifying QAYANI's backend infrastructure. Each section includes:
- **Why it matters** - The importance
- **What to build** - Specific implementation
- **How to test** - Verification steps
- **Code examples** - Production-ready patterns

---

## 1️⃣ Database Layer Solidification

### 1.1 Apply Database Migrations

**Why:** Database schema must match code expectations

**Implementation:**

```bash
# Create migrations directory structure
mkdir -p supabase/migrations

# Move existing schema to migrations
cp supabase/schema.sql supabase/migrations/20250101000001_initial_schema.sql

# Migrations are already in place, verify them
ls -la supabase/migrations/
```

**Apply via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/sql/new
2. Copy contents of `supabase/migrations/20250101000005_create_user_avatars.sql`
3. Click "Run"
4. Repeat for `20250101000006_create_voice_models.sql`

**Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check specific tables
SELECT * FROM public.user_avatars LIMIT 1;
SELECT * FROM public.voice_models LIMIT 1;
```

### 1.2 Add Database Indexes

**Why:** Fast queries even with millions of records

**Create file:** `supabase/migrations/20250101000007_add_indexes.sql`

```sql
-- User lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Personality queries
CREATE INDEX idx_personalities_user_id ON public.personalities(user_id);
CREATE INDEX idx_personalities_active ON public.personalities(is_active) WHERE is_active = true;

-- Recording queries
CREATE INDEX idx_recordings_personality ON public.recordings(personality_id);
CREATE INDEX idx_recordings_user ON public.recordings(user_id);
CREATE INDEX idx_recordings_status ON public.recordings(processing_status);

-- Conversation queries
CREATE INDEX idx_conversations_user ON public.conversations(user_id);
CREATE INDEX idx_conversations_created ON public.conversations(created_at DESC);

-- User memory queries
CREATE INDEX idx_user_memories_user ON public.user_memories(user_id);
CREATE INDEX idx_user_memories_importance ON public.user_memories(importance_score DESC);
CREATE INDEX idx_user_memories_type ON public.user_memories(memory_type);

-- Avatar queries
CREATE INDEX idx_user_avatars_user ON public.user_avatars(user_id);
CREATE INDEX idx_user_avatars_status ON public.user_avatars(generation_status);

-- Voice model queries
CREATE INDEX idx_voice_models_user ON public.voice_models(user_id);
CREATE INDEX idx_voice_models_status ON public.voice_models(training_status);

-- Composite indexes for common queries
CREATE INDEX idx_recordings_user_status ON public.recordings(user_id, processing_status);
CREATE INDEX idx_conversations_user_created ON public.conversations(user_id, created_at DESC);
```

### 1.3 Row Level Security (RLS) Policies

**Why:** Users can only access their own data

**Create file:** `supabase/migrations/20250101000008_enable_rls.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User memories policies
CREATE POLICY "Users can manage own memories"
  ON public.user_memories FOR ALL
  USING (auth.uid() = user_id);

-- Personalities policies
CREATE POLICY "Users can manage own personalities"
  ON public.personalities FOR ALL
  USING (auth.uid() = user_id);

-- Recordings policies
CREATE POLICY "Users can manage own recordings"
  ON public.recordings FOR ALL
  USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can manage own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

-- Avatar policies
CREATE POLICY "Users can manage own avatars"
  ON public.user_avatars FOR ALL
  USING (auth.uid() = user_id);

-- Voice model policies
CREATE POLICY "Users can manage own voice models"
  ON public.voice_models FOR ALL
  USING (auth.uid() = user_id);
```

---

## 2️⃣ Error Handling System

### 2.1 Custom Error Types

**Create file:** `lib/errors/types.ts`

```typescript
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Permission errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    public message: string,
    public details?: any,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'APIError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.userMessage || this.message,
        details: this.details,
      }
    };
  }
}

// Factory functions for common errors
export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    new APIError(401, ErrorCode.UNAUTHORIZED, message, undefined, message),

  invalidToken: (message = 'Invalid or expired token') =>
    new APIError(401, ErrorCode.INVALID_TOKEN, message, undefined, message),

  forbidden: (message = 'Insufficient permissions') =>
    new APIError(403, ErrorCode.FORBIDDEN, message, undefined, message),

  notFound: (resource: string) =>
    new APIError(404, ErrorCode.NOT_FOUND, `${resource} not found`, undefined, `${resource} not found`),

  validation: (details: any, message = 'Validation failed') =>
    new APIError(400, ErrorCode.VALIDATION_ERROR, message, details, 'Invalid input provided'),

  rateLimitExceeded: (resetTime: Date) =>
    new APIError(
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { resetTime: resetTime.toISOString() },
      'Too many requests. Please try again later.'
    ),

  externalService: (service: string, error: any) =>
    new APIError(
      502,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service error: ${service}`,
      error,
      'A third-party service is currently unavailable. Please try again.'
    ),

  internal: (error: any) =>
    new APIError(
      500,
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error,
      'An unexpected error occurred. Our team has been notified.'
    ),
};
```

### 2.2 Error Handler Middleware

**Create file:** `lib/errors/handler.ts`

```typescript
import { NextResponse } from 'next/server';
import { APIError } from './types';
import * as Sentry from '@sentry/nextjs';

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Handle known API errors
  if (error instanceof APIError) {
    // Log to Sentry for non-4xx errors
    if (error.statusCode >= 500) {
      Sentry.captureException(error, {
        tags: {
          error_code: error.code,
        },
        extra: {
          details: error.details,
        },
      });
    }

    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as any;
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: zodError.issues,
        },
      },
      { status: 400 }
    );
  }

  // Handle unknown errors
  Sentry.captureException(error);

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}

// Async error wrapper
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}
```

### 2.3 Request Validation with Zod

**Create file:** `lib/validation/schemas.ts`

```typescript
import { z } from 'zod';

// User schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Personality schemas
export const createPersonalitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dateOfBirth: z.string().optional(),
  dateOfPassing: z.string().optional(),
  relationshipToCreator: z.string().max(100),
  personalityTraits: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
});

export const updatePersonalitySchema = createPersonalitySchema.partial();

// Recording schemas
export const uploadRecordingSchema = z.object({
  personalityId: z.string().uuid('Invalid personality ID'),
  file: z.instanceof(File),
  duration: z.number().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

// Chat schemas
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
});

// Avatar schemas
export const createAvatarSchema = z.object({
  avatarUrl: z.string().url('Invalid avatar URL'),
  glbUrl: z.string().url('Invalid GLB URL').optional(),
  customization: z.record(z.any()).optional(),
});

// Voice model schemas
export const trainVoiceSchema = z.object({
  modelName: z.string().min(2).max(100),
  samples: z.array(z.string().url()).min(3, 'At least 3 voice samples required'),
  description: z.string().max(500).optional(),
});

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
```

---

## 3️⃣ API Middleware & Authentication

### 3.1 Authentication Middleware

**Create file:** `lib/middleware/auth.ts`

```typescript
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../supabase/admin';
import { Errors } from '../errors/types';

export async function requireAuth(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    throw Errors.unauthorized('Authorization header required');
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw Errors.unauthorized('Invalid authorization header format');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw Errors.invalidToken();
  }

  return data.user.id;
}

export async function optionalAuth(request: NextRequest): Promise<string | null> {
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}
```

### 3.2 Rate Limiting Middleware

**Install dependencies:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create file:** `lib/middleware/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { Errors } from '../errors/types';

// Initialize Redis (get credentials from Upstash)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limiters for different endpoints
export const rateLimiters = {
  // Authentication: 5 requests per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // API calls: 100 requests per minute
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  // File uploads: 10 per hour
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),

  // AI generation: 30 per hour
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: true,
    prefix: 'ratelimit:ai',
  }),
};

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<void> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  const headers = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(reset).toISOString(),
  };

  if (!success) {
    throw Errors.rateLimitExceeded(new Date(reset));
  }
}

// Wrapper for API routes
export function withRateLimit(
  limiter: Ratelimit,
  getIdentifier: (request: NextRequest) => string | Promise<string>
) {
  return async (request: NextRequest) => {
    const identifier = await getIdentifier(request);
    await checkRateLimit(identifier, limiter);
  };
}
```

---

## 4️⃣ File Upload & Validation

### 4.1 File Validation

**Create file:** `lib/upload/validator.ts`

```typescript
import { Errors } from '../errors/types';

export const FILE_CONSTRAINTS = {
  audio: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'],
    allowedExtensions: ['.mp3', '.wav', '.m4a', '.ogg'],
  },
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov'],
  },
};

export type FileType = keyof typeof FILE_CONSTRAINTS;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export async function validateFile(
  file: File,
  fileType: FileType
): Promise<ValidationResult> {
  const constraints = FILE_CONSTRAINTS[fileType];
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;

  // Check file type
  if (!constraints.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${constraints.allowedTypes.join(', ')}`,
    };
  }

  // Check file extension
  if (!constraints.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${constraints.allowedExtensions.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > constraints.maxSize) {
    const maxSizeMB = constraints.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  // Validate file content (magic bytes)
  const isValidContent = await validateFileContent(file, fileType);
  if (!isValidContent) {
    return {
      valid: false,
      error: 'File content does not match expected format',
    };
  }

  return {
    valid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
    },
  };
}

async function validateFileContent(file: File, fileType: FileType): Promise<boolean> {
  try {
    const buffer = await file.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 12));

    switch (fileType) {
      case 'audio':
        // MP3: FF FB or ID3
        // WAV: 52 49 46 46 (RIFF)
        // M4A: 00 00 00 XX 66 74 79 70
        return (
          (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) || // MP3
          (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) || // ID3
          (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) || // RIFF (WAV)
          (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) // ftyp (M4A)
        );

      case 'image':
        // JPEG: FF D8 FF
        // PNG: 89 50 4E 47
        // WebP: 52 49 46 46 ... 57 45 42 50
        // GIF: 47 49 46 38
        return (
          (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) || // JPEG
          (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) || // PNG
          (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) || // WebP
          (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) // GIF
        );

      case 'video':
        // MP4: 00 00 00 XX 66 74 79 70
        // WebM: 1A 45 DF A3
        return (
          (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) || // MP4
          (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) // WebM
        );

      default:
        return false;
    }
  } catch (error) {
    console.error('File content validation error:', error);
    return false;
  }
}

export function throwIfInvalid(result: ValidationResult): void {
  if (!result.valid) {
    throw Errors.validation({ fileValidation: result.error }, result.error);
  }
}
```

### 4.2 File Upload Helper

**Create file:** `lib/upload/supabase.ts`

```typescript
import { supabaseAdmin } from '../supabase/admin';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  bucket: string;
  folder?: string;
  filename?: string;
  contentType?: string;
  cacheControl?: string;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
}

export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const {
    bucket,
    folder = '',
    filename = `${uuidv4()}-${file.name}`,
    contentType = file.type,
    cacheControl = '3600',
  } = options;

  const path = folder ? `${folder}/${filename}` : filename;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      cacheControl,
      upsert: false,
    });

  if (error) {
    throw Errors.externalService('Supabase Storage', error);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    size: file.size,
  };
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw Errors.externalService('Supabase Storage', error);
  }
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw Errors.externalService('Supabase Storage', error);
  }

  return data.signedUrl;
}
```

---

## 5️⃣ Background Job System

### 5.1 Using Vercel Queue (Recommended)

**Install:**
```bash
npm install @vercel/functions
```

**Create file:** `lib/queue/types.ts`

```typescript
export enum JobType {
  PROCESS_RECORDING = 'process_recording',
  GENERATE_AVATAR = 'generate_avatar',
  TRAIN_VOICE = 'train_voice',
  SEND_EMAIL = 'send_email',
  CLEANUP_FILES = 'cleanup_files',
}

export interface JobPayload {
  [JobType.PROCESS_RECORDING]: {
    recordingId: string;
    userId: string;
  };
  [JobType.GENERATE_AVATAR]: {
    avatarId: string;
    userId: string;
  };
  [JobType.TRAIN_VOICE]: {
    voiceModelId: string;
    userId: string;
  };
  [JobType.SEND_EMAIL]: {
    to: string;
    template: string;
    data: Record<string, any>;
  };
  [JobType.CLEANUP_FILES]: {
    bucket: string;
    olderThan: string;
  };
}

export interface Job<T extends JobType> {
  id: string;
  type: T;
  payload: JobPayload[T];
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
}
```

**Create file:** `api/queue/recording/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const config = {
  maxDuration: 300, // 5 minutes
};

export async function POST(request: NextRequest) {
  const { recordingId, userId } = await request.json();

  try {
    // Update status
    await supabaseAdmin
      .from('recordings')
      .update({ processing_status: 'processing' })
      .eq('id', recordingId);

    // 1. Download audio file
    const { data: recording } = await supabaseAdmin
      .from('recordings')
      .select('file_url')
      .eq('id', recordingId)
      .single();

    // 2. Transcribe with Whisper API
    // 3. Extract memories and insights
    // 4. Store results

    // Update status
    await supabaseAdmin
      .from('recordings')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', recordingId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    // Update status to failed
    await supabaseAdmin
      .from('recordings')
      .update({ processing_status: 'failed' })
      .eq('id', recordingId);

    throw error;
  }
}
```

---

## 6️⃣ Logging & Monitoring

### 6.1 Structured Logging

**Create file:** `lib/logging/logger.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  private log(level: LogLevel, message: string, data?: any) {
    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };

    // Console logging
    console.log(JSON.stringify(logData));

    // Send to Sentry for warnings and errors
    if (level === LogLevel.ERROR) {
      Sentry.captureException(new Error(message), {
        level: 'error',
        extra: data,
      });
    } else if (level === LogLevel.WARN) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: data,
      });
    }
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error: any, data?: any) {
    this.log(LogLevel.ERROR, message, { error, ...data });
  }
}

export const logger = new Logger();
```

---

## 7️⃣ Testing Strategy

### 7.1 Database Tests

**Create file:** `tests/database/users.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabaseAdmin } from '../../lib/supabase/admin';

describe('User Database Operations', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
    });
    testUserId = data.user!.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
  });

  it('should create user profile', async () => {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: testUserId,
        personality_traits: { openness: 0.8 },
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.user_id).toBe(testUserId);
  });

  it('should enforce RLS policies', async () => {
    // Test that users can't access other users' data
    // This requires creating a separate Supabase client with user auth
  });
});
```

---

## 8️⃣ Implementation Checklist

### Week 1: Database Foundation
- [ ] Apply all database migrations
- [ ] Create and test indexes
- [ ] Enable RLS policies
- [ ] Verify data isolation
- [ ] Test database performance

### Week 2: API Reliability
- [ ] Implement error handling system
- [ ] Add request validation (Zod)
- [ ] Set up rate limiting (Upstash)
- [ ] Add authentication middleware
- [ ] Implement file validation

### Week 3: Async Processing
- [ ] Set up background job queue
- [ ] Implement recording processing
- [ ] Implement avatar generation
- [ ] Implement voice training
- [ ] Add retry logic

---

## 🧪 Testing Procedures

### Test Authentication Flow
```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","fullName":"Test User"}'

# Test signin
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Test Rate Limiting
```bash
# Send 10 requests quickly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer TOKEN" \
    -d '{"message":"Hello"}' &
done
```

### Test File Upload
```bash
# Upload audio file
curl -X POST http://localhost:3000/api/recordings/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test-audio.mp3" \
  -F "personalityId=UUID"
```

---

## 🎯 Success Criteria

After completing this guide, you should have:

✅ Database migrations applied with indexes
✅ RLS policies protecting user data
✅ Robust error handling on all endpoints
✅ Request validation with Zod
✅ Rate limiting preventing abuse
✅ File upload with validation
✅ Background job processing
✅ Structured logging system
✅ Comprehensive tests

---

**Next Step:** Move to Phase 2 - Testing & QA

**Remember:** Test each component thoroughly before moving to the next. Reliability is more important than speed!
