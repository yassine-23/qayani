/**
 * QAYANI Request Validation Schemas
 * Zod schemas for all API endpoints
 */

import { z } from 'zod';

// =====================================================
// AUTHENTICATION SCHEMAS
// =====================================================

export const signUpSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  personalityTraits: z.record(z.any()).optional(),
  speechPatterns: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
  lifeStory: z.string().max(10000).optional(),
});

// =====================================================
// PERSONALITY SCHEMAS
// =====================================================

export const createPersonalitySchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  dateOfPassing: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  relationshipToCreator: z
    .string()
    .max(100, 'Relationship must be less than 100 characters')
    .trim(),
  personalityTraits: z.record(z.number().min(0).max(1)).optional(),
  preferences: z.record(z.any()).optional(),
  lifeEvents: z.array(z.record(z.any())).optional(),
});

export const updatePersonalitySchema = createPersonalitySchema.partial();

// =====================================================
// RECORDING SCHEMAS
// =====================================================

export const uploadRecordingMetadataSchema = z.object({
  personalityId: z.string().uuid('Invalid personality ID'),
  duration: z.number().positive('Duration must be positive').optional(),
  metadata: z.record(z.any()).optional(),
  title: z.string().max(200).optional(),
});

export const processRecordingSchema = z.object({
  recordingId: z.string().uuid('Invalid recording ID'),
});

// =====================================================
// CHAT/CONVERSATION SCHEMAS
// =====================================================

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be less than 5000 characters')
    .trim(),
  sessionId: z.string().uuid().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50, 'Conversation history too long')
    .optional(),
  personalityId: z.string().uuid().optional(),
});

// =====================================================
// MEMORY SCHEMAS
// =====================================================

export const createMemorySchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must be less than 10000 characters')
    .trim(),
  title: z.string().max(200).optional(),
  memoryType: z
    .enum(['general', 'voice_recording', 'photo', 'journal', 'important_moment'])
    .default('general'),
  sourceFileUrl: z.string().url().optional(),
  emotionTags: z.array(z.string()).max(20).optional(),
  topics: z.array(z.string()).max(30).optional(),
  dateMentioned: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  importanceScore: z
    .number()
    .int()
    .min(1, 'Importance score must be between 1 and 10')
    .max(10, 'Importance score must be between 1 and 10')
    .default(5),
  metadata: z.record(z.any()).optional(),
});

export const updateMemorySchema = createMemorySchema.partial();

// =====================================================
// AVATAR SCHEMAS (Layer 1 - Visual)
// =====================================================

export const createAvatarSchema = z.object({
  avatarUrl: z.string().url('Invalid avatar URL'),
  glbUrl: z.string().url('Invalid GLB URL').optional(),
  thumbnailUrl: z.string().url().optional(),
  customization: z
    .object({
      bodyType: z.string().optional(),
      hairStyle: z.string().optional(),
      hairColor: z.string().optional(),
      skinTone: z.string().optional(),
      outfit: z.string().optional(),
      accessories: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateAvatarSchema = z.object({
  customization: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// =====================================================
// VOICE MODEL SCHEMAS (Layer 3 - Voice)
// =====================================================

export const trainVoiceSchema = z.object({
  modelName: z
    .string()
    .min(2, 'Model name must be at least 2 characters')
    .max(100, 'Model name must be less than 100 characters')
    .trim(),
  description: z.string().max(500).optional(),
  samples: z
    .array(z.string().url('Invalid sample URL'))
    .min(3, 'At least 3 voice samples required')
    .max(25, 'Maximum 25 voice samples allowed'),
  voiceSettings: z
    .object({
      stability: z.number().min(0).max(1).optional(),
      similarityBoost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      useSpeakerBoost: z.boolean().optional(),
    })
    .optional(),
});

export const generateVoiceSchema = z.object({
  text: z
    .string()
    .min(1, 'Text cannot be empty')
    .max(5000, 'Text must be less than 5000 characters')
    .trim(),
  voiceModelId: z.string().uuid('Invalid voice model ID'),
  voiceSettings: z
    .object({
      stability: z.number().min(0).max(1).default(0.5),
      similarityBoost: z.number().min(0).max(1).default(0.75),
    })
    .optional(),
});

// =====================================================
// AGENT/AI MODEL SCHEMAS (Layer 2 - Intelligence)
// =====================================================

export const modelProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'huggingface',
  'openrouter',
  'groq',
  'mistral'
]);

export const updateModelConfigSchema = z.object({
  modelProvider: modelProviderSchema.optional(),
  modelName: z.string().optional(),
  apiKey: z.string().optional(), // Sensitive, handle with care
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(100000).optional(),
  systemPrompt: z.string().max(10000).optional(),
  tools: z.array(z.string()).optional(),
});

export const memoryConfigSchema = z.object({
  provider: z.enum(['internal', 'google_drive', 'dropbox', 'onedrive']).default('internal'),
  accessToken: z.string().optional(),
  folderId: z.string().optional(),
  syncEnabled: z.boolean().default(true),
});

export const messagingConfigSchema = z.object({
  platform: z.enum(['telegram', 'whatsapp', 'discord', 'messenger', 'web']),
  enabled: z.boolean().default(false),
  apiKey: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  botUsername: z.string().optional(),
});

export const universalAgentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  intelligence: updateModelConfigSchema,
  memory: memoryConfigSchema.optional(),
  reach: z.array(messagingConfigSchema).optional(),
  appearance: z.object({
    type: z.enum(['photo', 'generic', 'stylized']),
    avatarUrl: z.string().url().optional(),
    glbUrl: z.string().url().optional(),
    colorTheme: z.string().optional(),
  }).optional(),
});

// =====================================================
// PAGINATION & FILTERING SCHEMAS
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate request data against a schema
 * Throws validation error if data is invalid
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

/**
 * Validate request data and return result with error details
 */
export function validateRequestSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

/**
 * Type exports for TypeScript
 */
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreatePersonalityInput = z.infer<typeof createPersonalitySchema>;
export type UpdatePersonalityInput = z.infer<typeof updatePersonalitySchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;
export type TrainVoiceInput = z.infer<typeof trainVoiceSchema>;
export type GenerateVoiceInput = z.infer<typeof generateVoiceSchema>;
export type UpdateModelConfigInput = z.infer<typeof updateModelConfigSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
