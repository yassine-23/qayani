import { z } from 'zod';

export const ModelConfigSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  name: z.string().min(1, 'Model name is required'),
  temperature: z
    .number()
    .min(0, 'Temperature must be between 0 and 2')
    .max(2, 'Temperature must be between 0 and 2')
    .optional()
    .default(0.7),
  maxTokens: z
    .number()
    .int('maxTokens must be an integer')
    .positive('maxTokens must be positive')
    .optional()
    .default(2048),
});

export const MemoryConfigSchema = z.object({
  backend: z.string().min(1).default('local'),
  maxHistory: z
    .number()
    .int('maxHistory must be an integer')
    .positive('maxHistory must be positive')
    .optional()
    .default(50),
});

export const PersonaConfigSchema = z.object({
  traits: z
    .record(
      z.string(),
      z
        .number()
        .min(0, 'Trait score must be between 0 and 1')
        .max(1, 'Trait score must be between 0 and 1')
    )
    .default({}),
  voice: z.string().optional(),
  expertise: z.array(z.string()).optional().default([]),
});

export const AgentConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Agent name must contain only alphanumeric characters, hyphens, and underscores'
    ),
  version: z.string().min(1, 'Version is required').default('1.0'),
  description: z.string().min(1, 'Description is required'),
  model: ModelConfigSchema,
  memory: MemoryConfigSchema.default({ backend: 'local', maxHistory: 50 }),
  persona: PersonaConfigSchema.optional(),
  tools: z.array(z.string()).optional().default([]),
  vars: z.record(z.string(), z.string()).optional().default({}),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;
export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;
