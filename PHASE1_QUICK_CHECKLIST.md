# ✅ QAYANI Phase 1 - Quick Completion Checklist

**Status:** 80% Complete | **Target:** 100% by Nov 6, 2025

---

## Today's Tasks (High Priority)

### ☐ 1. Apply Rate Limiting to API Routes (2-3 hours)

**Pattern to Follow (from `/api/chat/route.ts`):**
```typescript
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest, yourSchema } from '../../../lib/validation/schemas';

async function handler(request: NextRequest, userId: string) {
  const body = await request.json();
  const data = validateRequest(yourSchema, body);
  // Your logic
  return successResponse(result);
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(handler),
  { requests: N, window: 'X m' }
);
```

**Routes to Update:**
- ☐ `/api/auth/signin` → 5 req/5min
- ☐ `/api/auth/signup` → 3 req/hour
- ☐ `/api/auth/google` → 10 req/hour
- ☐ `/api/personalities/create` → 5 req/min
- ☐ `/api/personalities/[id]` → GET: 60/min, PUT: 20/min, DELETE: 5/min
- ☐ `/api/recordings/upload` → 5 req/min
- ☐ `/api/recordings/[id]` → GET: 60/min, DELETE: 10/min
- ☐ `/api/create-checkout-session` → 5 req/min
- ☐ `/api/webhook/stripe` → No rate limit (use withErrorHandling only)

**Reference:** See `scripts/apply-rate-limiting.md` for detailed templates

---

### ☐ 2. Set Up Upstash Redis (30 minutes)

1. ☐ Go to https://upstash.com/ and sign up
2. ☐ Create new Redis database (Choose region closest to your users)
3. ☐ Copy REST URL and REST Token
4. ☐ Add to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```
5. ☐ Test locally: `npm run dev` and make API request
6. ☐ Check rate limit headers in response:
   ```
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 99
   X-RateLimit-Reset: 2025-10-23T...
   ```

---

### ☐ 3. Apply Database Migrations (30 minutes)

**Commands:**
```bash
# Step 1: Login
npx supabase login

# Step 2: Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Step 3: Push migrations
npx supabase db push

# Step 4: Verify (in Supabase dashboard SQL editor)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

# Should see 25+ indexes

# Step 5: Verify RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

# Should see 8 tables with RLS enabled
```

**Verification:**
- ☐ All indexes created successfully
- ☐ RLS enabled on 8 tables
- ☐ Test with API requests to verify performance

---

## This Week's Tasks (Medium Priority)

### ☐ 4. Set Up Sentry Error Tracking (2 hours)

**Commands:**
```bash
# Step 1: Sign up at https://sentry.io/
# Step 2: Create new project (select Next.js)
# Step 3: Install SDK
npm install @sentry/nextjs

# Step 4: Run wizard
npx @sentry/wizard@latest -i nextjs

# Step 5: Add to .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=your_auth_token

# Step 6: Test error tracking
# Trigger an error in your app and check Sentry dashboard
```

**Update `lib/errors/handler.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

function logErrorToMonitoring(error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    if (error instanceof APIError && error.isServerError()) {
      Sentry.captureException(error, {
        tags: { error_code: error.code },
        extra: { details: error.details },
      });
    } else {
      Sentry.captureException(error);
    }
  }
}
```

- ☐ Sentry project created
- ☐ SDK installed and configured
- ☐ Error handler updated
- ☐ Test error tracking
- ☐ Set up alerts for critical errors

---

### ☐ 5. Test OAuth Flow (2 hours)

**Test Scenarios:**
- ☐ New user signup with Google
- ☐ Existing user login with Google
- ☐ Email conflict (user exists with email)
- ☐ OAuth cancellation by user
- ☐ Network error during OAuth
- ☐ Token refresh after expiration
- ☐ Multi-device sessions (login on 2 devices)
- ☐ Session timeout (after 7 days)
- ☐ Logout and re-login
- ☐ Verify session persistence across page reloads

**Testing Commands:**
```bash
# Start dev server
npm run dev

# Test OAuth flow in browser
# Use incognito mode to simulate new user

# Check Supabase Auth dashboard for new users
# Check database for user profiles created
```

---

### ☐ 6. Implement Background Job Queue (4-6 hours)

**Option A: Vercel Queue (Recommended)**
```bash
npm install @vercel/queues
```

**Files to Create:**
- ☐ `lib/queue/client.ts` - Queue configuration
- ☐ `lib/queue/handlers/voice-processing.ts`
- ☐ `lib/queue/handlers/avatar-generation.ts`
- ☐ `lib/queue/handlers/email-notifications.ts`
- ☐ `app/api/jobs/enqueue/route.ts`
- ☐ `app/api/jobs/status/[id]/route.ts`

**Job Types:**
- ☐ Voice cloning (ElevenLabs API)
- ☐ Avatar generation (Ready Player Me API)
- ☐ Transcript processing (OpenAI Whisper)
- ☐ Email notifications

---

### ☐ 7. Write Unit Tests (4-6 hours)

**Install Testing Framework:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest
```

**Test Files to Create:**
- ☐ `lib/errors/__tests__/handler.test.ts`
- ☐ `lib/validation/__tests__/schemas.test.ts`
- ☐ `lib/middleware/__tests__/rate-limit.test.ts`
- ☐ `lib/upload/__tests__/validator.test.ts`

**Target Coverage:** 80%+

---

## Definition of Done (Phase 1)

### Infrastructure
- ✅ Error handling system implemented
- ✅ Validation system implemented
- ✅ Rate limiting middleware created
- ✅ File upload validation complete
- ✅ Database indexes ready
- ✅ RLS policies ready
- ☐ Rate limiting applied to all routes
- ☐ Database migrations applied to production

### External Services
- ☐ Upstash Redis configured
- ☐ Sentry error tracking active
- ☐ Background job queue implemented

### Testing & Validation
- ☐ OAuth flow tested end-to-end
- ☐ Rate limiting tested on all routes
- ☐ Unit tests written (80%+ coverage)
- ☐ Load testing performed (100 concurrent users)

### Documentation
- ✅ Phase 1 implementation plan
- ✅ Progress reports
- ✅ Rate limiting guide
- ✅ Environment configuration
- ☐ API documentation (OpenAPI/Swagger)

---

## Quick Progress Check

**Run this command to check your progress:**
```bash
# Count completed routes with rate limiting
grep -r "withRateLimitAndErrorHandling" app/api/ | wc -l

# Should be 14 when done (currently 1)
```

**Check migration status:**
```bash
# In Supabase dashboard
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
# Should be 25+ after migration
```

**Check error tracking:**
```bash
# Trigger test error
curl -X POST http://localhost:3000/api/test-error

# Check Sentry dashboard for error
```

---

## Time Estimates

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Apply rate limiting to 13 routes | 2-3 hours | High |
| Set up Upstash Redis | 30 minutes | High |
| Apply database migrations | 30 minutes | High |
| Set up Sentry | 2 hours | Medium |
| Test OAuth flow | 2 hours | Medium |
| Implement job queue | 4-6 hours | Medium |
| Write unit tests | 4-6 hours | Medium |

**Total Remaining:** 15-20 hours
**Days Available:** 14 days
**Hours per day needed:** 1-2 hours

---

## Success Criteria

### Technical Metrics
- [ ] API error rate < 1%
- [ ] All routes have rate limiting
- [ ] Rate limit headers present in all responses
- [ ] Database queries use indexes
- [ ] RLS policies enforced
- [ ] No security vulnerabilities (npm audit)

### Functional Metrics
- [ ] Rate limiting works correctly (verified with tests)
- [ ] Errors logged to Sentry
- [ ] OAuth flow works for new and existing users
- [ ] Background jobs process correctly
- [ ] File uploads validated correctly

### Documentation Metrics
- [ ] All environment variables documented
- [ ] API routes documented
- [ ] Testing procedures documented
- [ ] Deployment guide created

---

## Resources

### Documentation
- ✅ `PHASE1_IMPLEMENTATION_PLAN.md` - Full roadmap
- ✅ `PHASE1_PROGRESS.md` - Detailed progress
- ✅ `PHASE1_COMPLETION_SUMMARY.md` - What's been built
- ✅ `scripts/apply-rate-limiting.md` - Route update guide
- ✅ This checklist

### Code References
- ✅ `lib/errors/` - Error handling system
- ✅ `lib/validation/schemas.ts` - Validation schemas
- ✅ `lib/middleware/rate-limit.ts` - Rate limiting
- ✅ `lib/upload/validator.ts` - File validation
- ✅ `app/api/chat/route.ts` - Example updated route

### External Links
- Upstash: https://upstash.com/
- Sentry: https://sentry.io/
- Supabase: https://supabase.com/dashboard
- Vercel: https://vercel.com/

---

## Need Help?

1. **Rate Limiting Issues:** Check `lib/middleware/rate-limit.ts` comments
2. **Validation Errors:** Check `lib/validation/schemas.ts` for schema definitions
3. **Database Issues:** Check Supabase dashboard logs
4. **Error Tracking:** Check Sentry dashboard

---

**🎯 Let's finish Phase 1 strong and move to Phase 2! You've got this! 💪**
