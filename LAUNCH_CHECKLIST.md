# Qayani Launch Checklist

## Pre-Launch Validation (Complete Before Deployment)

### Technical Infrastructure ✅

- [x] Live Chat Mode with <300ms latency
- [x] Emotional Intelligence System (8 emotions detected)
- [x] Voice Cloning Integration (ElevenLabs)
- [x] Creator Dashboard with Analytics
- [x] Complete Supabase Data Persistence
- [x] 3D Avatar with Real-time Reactions
- [x] Authentication System (Supabase Auth)
- [x] Error Handling & Rate Limiting

### Environment Setup

#### Required Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17

# ElevenLabs Voice Cloning
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://qayani.com
NEXT_PUBLIC_APP_NAME=Qayani

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
```

#### Vercel Deployment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```
SUPABASE_SERVICE_ROLE_KEY (Secret)
OPENAI_API_KEY (Secret)
ELEVENLABS_API_KEY (Secret)
NEXT_PUBLIC_SUPABASE_URL (Plain)
NEXT_PUBLIC_SUPABASE_ANON_KEY (Plain)
NEXT_PUBLIC_SITE_URL (Plain)
```

### Database Setup

#### 1. Create Supabase Project

```bash
# Option A: Use existing project
# - Navigate to https://supabase.com/dashboard
# - Select your qayani project

# Option B: Create new project
# - Name: qayani-production
# - Database Password: (save securely)
# - Region: Choose closest to target users
```

#### 2. Run Migrations

```bash
# Connect to Supabase
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push

# Verify tables exist
npx supabase db remote exec "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"
```

Expected tables:
- `user_profiles`
- `live_chat_sessions`
- `live_chat_messages`
- `user_events`

#### 3. Enable Row Level Security

All tables should have RLS enabled. Verify:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All `rowsecurity` should be `true`.

### API Keys Validation

#### OpenAI API Key

```bash
# Test OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Should return list of models including gpt-4o-realtime-preview
```

**Pricing:** $0.06/min input + $0.24/min output = ~$0.30/min per conversation

**Budget Recommendation:**
- Start with $100/month credit limit
- 1,000 sessions × 5 min avg = 5,000 min = $1,500/mo at scale
- Set up billing alerts at $50, $100, $200

#### ElevenLabs API Key

```bash
# Test ElevenLabs API
curl https://api.elevenlabs.io/v1/user/subscription \
  -H "xi-api-key: $ELEVENLABS_API_KEY"

# Should return subscription details
```

**Pricing:** $0.30/1000 characters (Creator tier)

**Budget Recommendation:**
- Start with Creator plan ($22/mo = 100k characters)
- Voice training: ~$1-2 per voice
- 1,000 sessions × 500 words avg = 500k chars = $150/mo at scale

#### Supabase Project

```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Should return {"message":"Welcome to PostgREST"}
```

**Pricing:** Free tier includes:
- 500 MB database space
- 1 GB file storage
- 50 GB bandwidth
- Good for 0-1,000 users

**Upgrade Path:**
- Pro: $25/mo (8 GB database, 100 GB bandwidth)
- Team: $599/mo (unlimited everything)

### Local Testing

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Navigate to http://localhost:3000

# 4. Test key flows:
# - Sign up / Login
# - Navigate to /dashboard/live
# - Start voice conversation
# - Check emotion detection (console logs)
# - Navigate to /dashboard/creator (analytics)
# - Navigate to /dashboard/creator/voice (voice training)
```

**Key Tests:**

1. **Live Chat Latency Test**
   - Open /dashboard/live
   - Start conversation
   - Speak: "Hello, can you hear me?"
   - Measure time from end of speech → start of response
   - **Target:** <300ms

2. **Emotion Detection Test**
   - Start conversation
   - Speak with different emotions:
     - Happy: "This is amazing! I love it!"
     - Sad: "I'm feeling really down today..."
     - Excited: "OH MY GOD THIS IS INCREDIBLE!"
   - Check console logs for detected emotions
   - **Target:** Correct emotion detected 70%+ of time

3. **Voice Training Test**
   - Navigate to /dashboard/creator/voice
   - Upload 3 audio samples (minimum)
   - Enter voice name: "Test Voice"
   - Click "Train My Voice"
   - Wait for completion (~2-3 minutes)
   - **Target:** Voice profile created successfully

4. **Analytics Test**
   - Complete 3 conversations
   - Navigate to /dashboard/creator
   - Verify stats appear:
     - Total sessions: 3
     - Emotions detected
     - Session trends
   - **Target:** Data displays correctly

### Performance Benchmarks

Before launch, verify these metrics:

| Metric | Target | How to Test |
|--------|--------|-------------|
| Page Load Time | <2s | Chrome DevTools Network tab |
| Time to Interactive | <3s | Lighthouse audit |
| 3D Avatar FPS | 60 FPS | Browser FPS counter |
| Audio Latency | <300ms | Manual testing |
| API Response Time | <500ms | Network tab (analytics API) |
| Build Size | <500 KB JS | `npm run build` output |

```bash
# Run Lighthouse audit
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

**Targets:**
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Security Checklist

- [ ] Environment variables not committed to Git
- [ ] Supabase Row Level Security enabled on all tables
- [ ] Rate limiting enabled on all API routes
- [ ] CORS configured properly (only allow qayani.com)
- [ ] API keys use `process.env` (never hardcoded)
- [ ] User input sanitized (no XSS vulnerabilities)
- [ ] Authentication required for all creator endpoints
- [ ] File upload validation (voice training files)
- [ ] HTTPS enforced (Vercel does this automatically)

### Legal Compliance

- [ ] Privacy Policy published at /privacy
- [ ] Terms of Service published at /terms
- [ ] Cookie consent banner (if using analytics)
- [ ] GDPR compliance (EU users can delete data)
- [ ] Disclaimer: "Not a replacement for human interaction"
- [ ] OpenAI Usage Policy compliance
- [ ] ElevenLabs Terms of Service compliance

## Deployment Steps

### Option 1: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project
vercel link

# 4. Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add ELEVENLABS_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL

# 5. Deploy to production
vercel --prod

# 6. Set custom domain (optional)
vercel domains add qayani.com
```

**Post-Deployment Verification:**

```bash
# Test production site
curl https://qayani.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","services":{"supabase":"connected","openai":"ready"}}
```

### Option 2: Docker (Self-Hosted)

```bash
# 1. Build Docker image
docker build -t qayani:latest .

# 2. Run container
docker run -d \
  --name qayani \
  -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY \
  -e NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  qayani:latest

# 3. Verify
curl http://localhost:3000/api/health
```

### Option 3: AWS/GCP/Azure

See `DEPLOYMENT_GUIDE.md` for cloud provider-specific instructions.

## Post-Deployment Testing

### Production Health Check

```bash
# 1. Check homepage loads
curl -I https://qayani.com
# Expected: HTTP/2 200

# 2. Check API health
curl https://qayani.com/api/health
# Expected: {"status":"ok"}

# 3. Check authentication
# - Navigate to https://qayani.com
# - Click "Sign Up"
# - Complete registration
# - Verify email received
# - Login successfully

# 4. Check live chat
# - Navigate to https://qayani.com/dashboard/live
# - Start conversation
# - Verify avatar loads
# - Verify voice works
# - Verify messages save to database

# 5. Check analytics
# - Complete 1 conversation
# - Navigate to https://qayani.com/dashboard/creator
# - Verify stats appear
# - Verify charts render
```

### Load Testing (Optional)

```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  let res = http.get('https://qayani.com');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

**Target Metrics:**
- 95th percentile response time: <500ms
- Error rate: <1%
- Requests per second: 10+ (for initial launch)

## Launch Monitoring

### Set Up Alerts

#### Vercel Monitoring

Vercel automatically provides:
- Build status
- Deployment health
- Error tracking
- Performance monitoring

Access at: https://vercel.com/dashboard

#### Supabase Monitoring

Supabase Dashboard shows:
- Database usage
- API requests
- Storage usage
- Active connections

Set up alerts:
1. Navigate to Settings → Billing
2. Set usage alerts at 50%, 75%, 90% of quota

#### Error Tracking (Optional)

Install Sentry for error tracking:

```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

### Key Metrics to Monitor

**First 24 Hours:**
- [ ] Site uptime: 99.9%+
- [ ] Page load time: <2s
- [ ] Zero critical errors
- [ ] Authentication working
- [ ] Live chat functional
- [ ] Voice training successful

**First Week:**
- [ ] Total sign-ups: Track
- [ ] Active sessions: Track
- [ ] Average session duration: Target 5+ minutes
- [ ] Emotion detection accuracy: Target 70%+
- [ ] User satisfaction: Target 4+ stars
- [ ] Zero data loss incidents

**First Month:**
- [ ] Monthly Active Users (MAU): Target 50+
- [ ] Total conversations: Target 500+
- [ ] Voice clones created: Target 5+
- [ ] Paying customers: Target 1+
- [ ] MRR: Target $100+

## Cost Monitoring

### Expected Monthly Costs (First 3 Months)

| Service | Free Tier | After Limit | Notes |
|---------|-----------|-------------|-------|
| Vercel | ✅ Free (Hobby) | $20/mo (Pro) | Upgrade at 100 GB bandwidth |
| Supabase | ✅ Free | $25/mo (Pro) | Upgrade at 500 MB database |
| OpenAI | Pay-as-go | ~$0.30/min | $100/mo = 333 conversation minutes |
| ElevenLabs | $22/mo | $99/mo (Pro) | 100k → 500k characters |
| Domain | $12/year | - | qayani.com |
| **Total** | **$22/mo** | **$244/mo** | At scale (1,000 sessions/mo) |

**Budget Recommendations:**

**Phase 1: Beta (Month 1)**
- Spend: $50/mo
- Focus: 1 influencer, 50 users, 200 sessions
- Goal: Product-market fit validation

**Phase 2: Early Growth (Months 2-3)**
- Spend: $250/mo
- Focus: 5 influencers, 500 users, 2,000 sessions
- Goal: $5k MRR

**Phase 3: Scale (Months 4-6)**
- Spend: $1,000/mo
- Focus: 50 influencers, 5,000 users, 20,000 sessions
- Goal: $50k MRR

### Set Up Billing Alerts

**OpenAI:**
```bash
# Navigate to: https://platform.openai.com/account/billing/limits
# Set soft limit: $100
# Set hard limit: $200
```

**ElevenLabs:**
```bash
# Navigate to: https://elevenlabs.io/subscription
# Check usage: Monitor character count
# Upgrade when: >80% of quota used
```

**Vercel:**
```bash
# Navigate to: https://vercel.com/dashboard/usage
# Set alert at: 80 GB bandwidth (80% of free tier)
```

**Supabase:**
```bash
# Navigate to: https://supabase.com/dashboard/project/_/settings/billing
# Set alerts: 50%, 75%, 90% of database size
```

## Launch Day Checklist

### T-24 Hours (Day Before Launch)

- [ ] Final production deployment
- [ ] All environment variables verified
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] Backup plan ready (rollback to previous version)
- [ ] Support email setup (support@qayani.com)
- [ ] Monitoring dashboards open (Vercel, Supabase)

### T-1 Hour (Launch Hour)

- [ ] Final smoke test (sign up → conversation → analytics)
- [ ] Social media posts scheduled (if applicable)
- [ ] Team on standby for issues
- [ ] Launch announcement ready

### T+0 (Launch)

- [ ] Announce launch
- [ ] Monitor real-time traffic
- [ ] Watch error logs
- [ ] Test from different devices
- [ ] Check performance metrics

### T+1 Hour

- [ ] Verify first users signing up
- [ ] Check database is saving data
- [ ] Monitor API response times
- [ ] Test voice conversations
- [ ] Verify analytics tracking

### T+24 Hours

- [ ] Review metrics:
  - Total sign-ups
  - Active sessions
  - Errors encountered
  - Performance issues
- [ ] Address any critical bugs
- [ ] Collect user feedback
- [ ] Plan improvements

## Rollback Plan

If critical issues occur:

```bash
# Option 1: Rollback to previous deployment (Vercel)
vercel rollback

# Option 2: Redeploy specific commit
git checkout <previous-commit-hash>
vercel --prod

# Option 3: Emergency maintenance mode
# Create pages/maintenance.tsx with maintenance message
# Deploy immediately
```

## Support & Monitoring Checklist

- [ ] Support email monitored (support@qayani.com)
- [ ] Vercel dashboard open
- [ ] Supabase dashboard open
- [ ] Error tracking active
- [ ] Performance monitoring active
- [ ] User feedback system in place
- [ ] Bug tracking system ready (GitHub Issues)

## Success Criteria

**Week 1:**
- ✅ Zero downtime
- ✅ 10+ sign-ups
- ✅ 50+ conversations
- ✅ <300ms latency maintained
- ✅ 4+ star average satisfaction

**Week 2:**
- ✅ First beta influencer onboarded
- ✅ 100+ conversations from their audience
- ✅ Testimonial collected
- ✅ Case study published

**Week 4:**
- ✅ 5 beta influencers onboarded
- ✅ 1,000+ total conversations
- ✅ First paying customer
- ✅ $500+ MRR

---

## Next Steps After Launch

1. **Influencer Onboarding** (See `INFLUENCER_ONBOARDING.md`)
2. **Traction Metrics** (See `TRACTION_DASHBOARD.md`)
3. **YC Application** (See `YC_APPLICATION_S25.md`)
4. **Fundraising** (See `UNICORN_PIVOT_PLAN.md` → Fundraising Strategy)

---

**Launch Status:** 🟡 Ready for Deployment

**Blockers:** None (all technical work complete)

**Action Required:** Deploy to Vercel and begin influencer outreach

**Estimated Time to Launch:** 2 hours (deployment) + 1 day (first influencer onboarded)
