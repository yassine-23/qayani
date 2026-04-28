# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**QAYANI** - Digital Legacy Preservation Platform. Users preserve their wisdom, stories, and personality as AI-powered digital legacies. Family members interact with those legacies through natural conversations, voice, and 3D avatars.

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL/pgvector) + OpenAI + ElevenLabs + Stripe + Vercel

## Commands

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build (TS errors currently ignored via next.config.js)
npm run lint         # ESLint
npm test             # All Playwright tests
npm run test:e2e     # E2E tests only (tests/e2e/)
npm run test:api     # API tests only (tests/api/)
npm run test:report  # View HTML test report
```

Run a single test file: `npx playwright test tests/e2e/auth.spec.ts`
Run a single test by name: `npx playwright test -g "test name"`

Add `--headed`, `--ui`, or `--debug` suffix variants for interactive test modes (e.g. `npm run test:e2e:headed`).

Database setup requires `SUPABASE_DB_URL` env var, then `./setup-db.sh` or `psql "$SUPABASE_DB_URL" -f deploy-schema.sql`.

### Subprojects

```bash
cd cli && npm install && npm run build   # Compile the standalone CLI (do NOT edit cli/dist/ by hand)
cd server && npm install && npm run dev  # Start live-chat WebSocket relay with file watching
```

## Architecture

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`). Use `import { foo } from '@/lib/bar'` instead of relative paths.

### Request Flow

1. `middleware.ts` handles route protection: only `/profile` and `/recordings` require auth. Dashboard, capture, and eternal pages allow unauthenticated preview access.
2. `lib/auth/context.tsx` provides `AuthProvider` + `useAuth()` hook for client-side auth state (Supabase Auth with PKCE flow, Google OAuth).
3. API routes live in `app/api/*/route.ts` and use server-side wrappers from `lib/errors/handler.ts`.

### API Route Pattern

API routes use composable wrappers, not raw try-catch:

```typescript
// Unauthenticated endpoint:
export const POST = withErrorHandling(async (request) => { ... });

// Authenticated endpoint (auto-extracts userId):
export const POST = withAuthErrorHandling(async (request, userId) => { ... });
```

These wrappers (`lib/errors/handler.ts`) automatically handle Zod validation errors, Supabase errors, and APIError instances. Use `successResponse(data)` and `paginatedResponse(data, pagination)` helpers for consistent response shapes.

### Rate Limiting

`lib/middleware/rate-limit.ts` uses Upstash Redis with tiered limits:
- Tiers: FREE (100/10min), PREMIUM (1000/10min), ADMIN (10000/10min)
- Stricter per-endpoint limits for expensive ops: chat (20/min), voice (10/min), voice cloning (3/hr), auth signup (3/hr)
- Disabled gracefully when Redis credentials are missing (dev mode)

### Input Validation

All API input validated with Zod schemas in `lib/validation/schemas.ts`. Zod errors are auto-formatted by the error handler.

### Database Access

- **Client-side** (`lib/supabase/client.ts`): Uses anon key, enforced by RLS
- **Server-side** (`lib/supabase/admin.ts`): Uses service role key, bypasses RLS. Also provides `verifyUser(token)` and `createUserProfile()`
- Types in `lib/supabase/types.ts`
- Full schema in `deploy-schema.sql`; migrations in `supabase/migrations/`

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | Profiles + subscription tier (free/premium/family) |
| `personalities` | Digital legacies with traits, voice profiles |
| `user_memories` | Raw memories with importance scoring |
| `recordings` | Audio files with transcription + emotion analysis |
| `conversation_history` / `conversation_sessions` | Chat persistence |
| `memory_embeddings` / `conversation_embeddings` | pgvector (1536-dim, text-embedding-ada-002) |
| `embedding_queue` | Background embedding processing |
| `wisdom_highlights` | AI-extracted insights with categorization |
| `family_connections` | Access sharing with invitation workflow |
| `voice_profiles` | ElevenLabs voice cloning data |
| `avatar_marketplace` | Sellable avatar templates with pricing |

All tables use UUID PKs, `created_at`/`updated_at` timestamps, and RLS policies.

### AI Systems (`lib/ai/`)

- `embeddings.ts` - Vector embeddings (OpenAI ada-002) + semantic search via pgvector
- `wisdom-extraction.ts` - Extract quotes/insights from memories, categorize and score
- `personality-modeling.ts` - Big Five traits + speech patterns + communication style
- `conversation-memory.ts` - `PostgresChatHistory` class for persistent chat sessions
- `emotion-detection.ts` - Sentiment analysis on user input

Chat generation uses `lib/openai/client.ts` with RAG: query embedding -> vector similarity search -> inject context -> GPT completion.

### Voice System

`lib/elevenlabs/` and `lib/voice/` handle voice synthesis and cloning via ElevenLabs API. Audio hooks in `lib/hooks/useAudioStream.ts`.

### 3D Avatars

`components/3d/` uses Three.js via @react-three/fiber and @react-three/drei. Key components: `UniversalAvatar.tsx`, `QayaniLiveAvatar.tsx` (real-time with audio sync), `TalkingAvatar.tsx`.

### Live Chat

`server/realtime-relay.js` is a separate Node.js WebSocket relay server for real-time messaging. It has its own `package.json` and runs independently from the Next.js app.

## Design System

Dark, neon-accented aesthetic with custom Tailwind config:

- **Primary accent**: `neon` (#00FF66), `neon-bright` (#39FF14), `neon-dim` (#00CC52)
- **Surfaces**: `surface` (#030303), `surface-50` (#080808) through `surface-300` (#1A1A1A)
- **Legacy aliases**: `qayani-gold` and variants now map to the neon palette (not the original gold)
- **Typography classes** (in `globals.css`): `.heading-xl` through `.caption`
- **Component classes**: `.glass-card` (frosted glass), `.btn-primary`, `.btn-secondary` (outlined), `.input`
- **Box shadows**: `neon-sm`, `neon-md`, `neon-lg`, `neon-glow`, `inner-glow`
- **Font**: Inter (sans), JetBrains Mono (mono)
- No emojis in UI. Professional language only.

## Coding Conventions

- TypeScript with 2-space indentation, semicolons, ES module imports
- PascalCase for React components, camelCase for functions/utilities
- Pages: `page.tsx`, API handlers: `route.ts`, hooks: `useX.ts`, tests: `*.spec.ts`
- Commit messages: imperative style (`feat: add avatar marketplace filter`, `fix: handle missing session`)

## Auth Middleware (`lib/middleware/auth.ts`)

Key helpers for API routes:
- `requireAuth(request)` - Returns userId or throws 401
- `optionalAuth(request)` - Returns userId or null
- `requireOwnership(userId, resourceOwnerId)` - Throws 403 on mismatch
- `requireSubscriptionTier(userId, requiredTier)` - Enforces plan limits

## Environment Variables

See `.env.example` for full list. Critical ones:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY` (embeddings + chat), `ANTHROPIC_API_KEY` (available)
- `ELEVENLABS_API_KEY` (voice)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting, optional)

## Gotchas

- `next.config.js` has `ignoreBuildErrors: true` - TypeScript errors won't fail builds
- Rate limiting silently disabled without Upstash credentials
- Auth signup sets `email_confirm: true`, bypassing email verification
- `AuthProvider` has a 2-second loading timeout failsafe
- Dashboard/capture/eternal pages are publicly accessible (preview mode) - auth is optional there
- Playwright tests run Chromium only (Firefox/Safari commented out in config)
- Playwright auto-starts `npm run dev` before tests; reuses existing server outside CI
