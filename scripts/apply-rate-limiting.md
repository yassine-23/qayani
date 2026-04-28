# API Route Rate Limiting Application Guide

## Routes to Update (13 remaining)

### Authentication Routes (High Priority - Brute Force Protection)

#### 1. `/api/auth/signin` - 5 requests / 5 minutes
```typescript
// app/api/auth/signin/route.ts
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { successResponse } from '../../../lib/errors/handler';
import { validateRequest, signInSchema } from '../../../lib/validation/schemas';

async function signinHandler(request: NextRequest) {
  const body = await request.json();
  const { email, password } = validateRequest(signInSchema, body);

  // Your authentication logic here

  return successResponse({ token, user }, 200);
}

export const POST = withRateLimitAndErrorHandling(signinHandler, {
  requests: 5,
  window: '5 m'
});
```

#### 2. `/api/auth/signup` - 3 requests / 1 hour
```typescript
// app/api/auth/signup/route.ts
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { successResponse } from '../../../lib/errors/handler';
import { validateRequest, signUpSchema } from '../../../lib/validation/schemas';

async function signupHandler(request: NextRequest) {
  const body = await request.json();
  const data = validateRequest(signUpSchema, body);

  // Your signup logic here

  return successResponse({ user }, 201);
}

export const POST = withRateLimitAndErrorHandling(signupHandler, {
  requests: 3,
  window: '1 h'
});
```

#### 3. `/api/auth/google` - 10 requests / 1 hour
```typescript
// app/api/auth/google/route.ts
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';

async function googleAuthHandler(request: NextRequest) {
  // Your Google OAuth logic here

  return NextResponse.redirect(redirectUrl);
}

export const GET = withRateLimitAndErrorHandling(googleAuthHandler, {
  requests: 10,
  window: '1 h'
});
```

---

### Personality Routes (Authenticated, Moderate Limits)

#### 4. `/api/personalities/create` - 5 requests / 1 minute
```typescript
// app/api/personalities/create/route.ts
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest, createPersonalitySchema } from '../../../lib/validation/schemas';

async function createPersonalityHandler(request: NextRequest, userId: string) {
  const body = await request.json();
  const data = validateRequest(createPersonalitySchema, body);

  // Your personality creation logic here

  return successResponse({ personality }, 201);
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createPersonalityHandler),
  { requests: 5, window: '1 m' }
);
```

#### 5. `/api/personalities/[id]` - GET: 60/min, PUT: 20/min, DELETE: 5/min
```typescript
// app/api/personalities/[id]/route.ts
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest, updatePersonalitySchema } from '../../../../lib/validation/schemas';

async function getPersonalityHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  // Your GET logic here
  return successResponse({ personality });
}

async function updatePersonalityHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const data = validateRequest(updatePersonalitySchema, body);

  // Your UPDATE logic here
  return successResponse({ personality });
}

async function deletePersonalityHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  // Your DELETE logic here
  return successResponse({ message: 'Personality deleted' });
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getPersonalityHandler),
  { requests: 60, window: '1 m' }
);

export const PUT = withRateLimitAndErrorHandling(
  withAuthErrorHandling(updatePersonalityHandler),
  { requests: 20, window: '1 m' }
);

export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(deletePersonalityHandler),
  { requests: 5, window: '1 m' }
);
```

---

### Recording Routes (Bandwidth Intensive)

#### 6. `/api/recordings/upload` - 5 requests / 1 minute
```typescript
// app/api/recordings/upload/route.ts
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest, uploadRecordingMetadataSchema } from '../../../lib/validation/schemas';

async function uploadRecordingHandler(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const metadata = JSON.parse(formData.get('metadata') as string);

  // Validate metadata
  const validatedMetadata = validateRequest(uploadRecordingMetadataSchema, metadata);

  // Your upload logic here

  return successResponse({ recording }, 201);
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(uploadRecordingHandler),
  { requests: 5, window: '1 m' }
);
```

#### 7. `/api/recordings/[id]` - GET: 60/min, DELETE: 10/min
```typescript
// app/api/recordings/[id]/route.ts
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';

async function getRecordingHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  // Your GET logic here
  return successResponse({ recording });
}

async function deleteRecordingHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  // Your DELETE logic here
  return successResponse({ message: 'Recording deleted' });
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getRecordingHandler),
  { requests: 60, window: '1 m' }
);

export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(deleteRecordingHandler),
  { requests: 10, window: '1 m' }
);
```

---

### Payment Routes (Critical - Low Limits)

#### 8. `/api/create-checkout-session` - 5 requests / 1 minute
```typescript
// app/api/create-checkout-session/route.ts
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import Stripe from 'stripe';

async function createCheckoutHandler(request: NextRequest, userId: string) {
  const body = await request.json();
  const { priceId, successUrl, cancelUrl } = body;

  // Create Stripe checkout session

  return successResponse({ sessionId, url });
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createCheckoutHandler),
  { requests: 5, window: '1 m' }
);
```

#### 9. `/api/webhook/stripe` - Special handling (verify signature, no rate limit)
```typescript
// app/api/webhook/stripe/route.ts
import { withErrorHandling } from '../../../lib/errors/handler';
import Stripe from 'stripe';

async function stripeWebhookHandler(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  // Verify webhook signature
  // Handle webhook events

  return new NextResponse(null, { status: 200 });
}

// Note: Webhooks should NOT have rate limiting
// Stripe has its own retry logic
export const POST = withErrorHandling(stripeWebhookHandler);
```

---

### Test/Setup Routes (Can be removed in production)

#### 10. `/api/test-db` - Remove in production or add auth
```typescript
// app/api/test-db/route.ts
// RECOMMENDED: Remove this route in production
// Or add authentication + rate limiting for development use

import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';

async function testDbHandler(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    throw Errors.forbidden('This endpoint is only available in development');
  }

  // Your database test logic

  return successResponse({ status: 'ok' });
}

export const GET = withRateLimitAndErrorHandling(testDbHandler, {
  requests: 10,
  window: '1 m'
});
```

#### 11. `/api/setup-db` - Remove in production
```typescript
// app/api/setup-db/route.ts
// RECOMMENDED: Remove this route in production
// Database setup should be done via migrations

import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';

async function setupDbHandler(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    throw Errors.forbidden('This endpoint is only available in development');
  }

  // Your database setup logic

  return successResponse({ message: 'Database setup complete' });
}

export const POST = withRateLimitAndErrorHandling(setupDbHandler, {
  requests: 1,
  window: '1 h'
});
```

---

## Quick Application Checklist

For each route, follow this pattern:

1. **Import required modules**
```typescript
import { withRateLimitAndErrorHandling } from '../path/to/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../path/to/errors/handler';
import { validateRequest, yourSchema } from '../path/to/validation/schemas';
import { Errors } from '../path/to/errors/types';
```

2. **Extract handler function**
```typescript
async function yourHandler(request: NextRequest, userId?: string) {
  // Validate request
  const body = await request.json();
  const data = validateRequest(yourSchema, body);

  // Your logic here

  return successResponse(result);
}
```

3. **Apply wrappers**
```typescript
// For authenticated routes:
export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(yourHandler),
  { requests: N, window: 'X m' }
);

// For public routes:
export const POST = withRateLimitAndErrorHandling(yourHandler, {
  requests: N,
  window: 'X m'
});
```

4. **Test the route**
```bash
# Test rate limiting
for i in {1..25}; do curl -X POST http://localhost:3000/api/your-route; done

# Should see 429 after exceeding limit
```

---

## Rate Limit Recommendations by Route Type

| Route Type | Requests | Window | Reasoning |
|-----------|----------|--------|-----------|
| Authentication (signin) | 5 | 5 min | Brute force protection |
| Authentication (signup) | 3 | 1 hour | Prevent spam accounts |
| OAuth callbacks | 10 | 1 hour | Normal OAuth flow |
| Chat/AI | 20 | 1 min | Balance UX with cost |
| File uploads | 5-10 | 1 min | Bandwidth protection |
| CRUD operations (GET) | 60 | 1 min | Generous for UX |
| CRUD operations (POST/PUT) | 20 | 1 min | Moderate for writes |
| CRUD operations (DELETE) | 5-10 | 1 min | Careful with deletes |
| Payment | 5 | 1 min | Prevent abuse |
| Webhooks | No limit | - | External service controlled |

---

## Testing Rate Limits

```bash
# Install testing tool
npm install -g autocannon

# Test an endpoint
autocannon -c 10 -d 5 -m POST \
  -H "Content-Type: application/json" \
  -b '{"message":"test"}' \
  http://localhost:3000/api/chat

# Check for 429 responses in output
```

---

## Next Steps

1. Update each route following the patterns above
2. Test each route with the testing commands
3. Verify rate limit headers are present
4. Update `.env.local` with Upstash Redis credentials
5. Deploy and test in production

Good luck! 🚀
