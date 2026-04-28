# 🚀 Eternal Platform - Production Deployment Guide

## Overview
Complete guide for deploying the Eternal Platform to production with Supabase, OpenAI, and Vercel.

---

## 📋 Prerequisites

### Required Services & Accounts
1. **Supabase Account** - Database, Authentication, Storage
2. **OpenAI Account** - GPT-4 API for personality simulation
3. **Vercel Account** - Frontend/API deployment
4. **Google Cloud Console** - OAuth authentication
5. **Stripe Account** (Optional) - Payment processing

### Environment Setup
Ensure you have:
- Node.js 18+ installed
- Git configured
- Supabase CLI (optional)

---

## 🏗 Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and enter project details:
   - **Name**: `eternal-platform-prod`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users

### 1.2 Configure Database
```bash
# Set your database connection string
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Run the database setup script
./setup-db.sh
```

### 1.3 Configure Storage
1. Go to Storage → Buckets
2. Verify "recordings" bucket was created
3. Check bucket policies are applied
4. Test file upload permissions

### 1.4 Enable Authentication Providers
1. Go to Authentication → Settings → Auth Providers
2. **Enable Google OAuth**:
   - Get credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Add OAuth 2.0 Client ID
   - Set authorized redirect URIs:
     - `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
     - `https://yourdomain.com/auth/callback`

### 1.5 Get API Keys
From Settings → API:
- **Project URL**: Copy for `NEXT_PUBLIC_SUPABASE_URL`
- **Anon Public Key**: Copy for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key**: Copy for `SUPABASE_SERVICE_KEY`

---

## 🤖 Step 2: OpenAI Setup

### 2.1 Get API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy for `OPENAI_API_KEY`

### 2.2 Configure Usage Limits
1. Set monthly spending limits
2. Configure rate limits
3. Enable usage tracking

---

## 🌐 Step 3: Environment Configuration

### 3.1 Update .env.local
```bash
# Claude API Configuration (Primary AI Engine)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI Configuration (Backup/Fallback)
OPENAI_API_KEY=your_real_openai_api_key_here

# Supabase Configuration (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Stripe Configuration (Payments)
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# ElevenLabs for voice synthesis
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=Eternal

# Feature Flags
ENABLE_VOICE_SYNTHESIS=true
ENABLE_FAMILY_INVITES=true
ENABLE_PREMIUM_FEATURES=true
```

---

## 🚀 Step 4: Vercel Deployment

### 4.1 Prepare for Deployment
```bash
# Build and test locally
npm run build
npm start

# Test key endpoints
curl http://localhost:3000/api/health
```

### 4.2 Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? N (for first deploy)
# - Project name: eternal-platform
# - Deploy: Y
```

### 4.3 Configure Environment Variables
In Vercel Dashboard:
1. Go to Project → Settings → Environment Variables
2. Add all variables from `.env.local`:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - And all others...

### 4.4 Configure Domain
1. Go to Project → Settings → Domains
2. Add your custom domain
3. Configure DNS (A record or CNAME)
4. Enable SSL (automatic with Vercel)

---

## 🔐 Step 5: Security Configuration

### 5.1 CORS Configuration
Update Supabase Auth settings:
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`

### 5.2 Database Security
Verify RLS (Row Level Security) policies:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

### 5.3 API Rate Limiting
Configure Vercel Edge Functions:
```javascript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Add rate limiting logic
  return NextResponse.next();
}
```

---

## 📊 Step 6: Testing & Verification

### 6.1 API Endpoint Testing
```bash
# Test authentication
curl -X POST https://yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","fullName":"Test User"}'

# Test personality creation
curl -X POST https://yourdomain.com/api/personalities/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"name":"Test Personality","relationshipToCreator":"grandfather"}'

# Test chat functionality
curl -X POST https://yourdomain.com/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"message":"Hello","personalityId":"[PERSONALITY_ID]"}'
```

### 6.2 Database Verification
```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public';

-- Verify storage bucket
SELECT * FROM storage.buckets WHERE id = 'recordings';
```

### 6.3 Frontend Testing
1. **Registration Flow**: Create account, verify email
2. **Authentication**: Login/logout, Google OAuth
3. **Personality Creation**: Create and manage personalities
4. **Recording Upload**: Upload audio, verify transcription
5. **Chat Interface**: Test conversations with AI
6. **Family Features**: Invite family members
7. **Mobile Responsive**: Test on various devices

---

## 📈 Step 7: Monitoring & Analytics

### 7.1 Supabase Analytics
Monitor from Supabase Dashboard:
- Database usage and performance
- Storage usage
- Auth events
- API requests

### 7.2 Vercel Analytics
Enable in Vercel Dashboard:
- Performance monitoring
- Error tracking
- Usage statistics
- Core Web Vitals

### 7.3 Custom Analytics
Add to your app:
```typescript
// Track key events
import { supabaseAdmin } from '../lib/supabase/admin';

await supabaseAdmin.rpc('track_usage', {
  p_user_id: userId,
  p_feature: 'personality_chat',
  p_metadata: { response_time: responseTime }
});
```

---

## 🛠 Step 8: Maintenance & Updates

### 8.1 Database Backups
Supabase automatically backs up your database, but:
1. Set up additional backup strategy
2. Test restoration process
3. Document backup schedules

### 8.2 Monitoring & Alerts
Set up alerts for:
- API errors (>5% error rate)
- Database performance issues
- Storage quota approaching limits
- Authentication failures

### 8.3 Updates & Migrations
```bash
# For database schema updates
psql "$SUPABASE_DB_URL" -f new-migration.sql

# For application updates
git push origin main  # Auto-deploy via Vercel
```

---

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Test connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"
```

#### Authentication Issues
- Check CORS settings
- Verify JWT secrets
- Confirm redirect URLs

#### File Upload Failures
- Check storage policies
- Verify bucket permissions
- Test file size limits

#### API Timeout Issues
- Check Vercel function limits
- Optimize database queries
- Implement caching

### Debug Commands
```bash
# Check logs
vercel logs [deployment-url]

# Local debugging
npm run dev
```

---

## 📋 Production Checklist

### Before Launch
- [ ] Database schema deployed
- [ ] All environment variables configured
- [ ] Authentication providers enabled
- [ ] Storage buckets configured
- [ ] Domain configured with SSL
- [ ] API endpoints tested
- [ ] Frontend functionality verified
- [ ] Mobile responsiveness checked
- [ ] Performance optimized
- [ ] Security measures implemented

### Post-Launch
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backup systems
- [ ] Document admin procedures
- [ ] Set up alerting
- [ ] Plan scaling strategy

---

## 🎉 Your Eternal Platform is Live!

**Main URLs:**
- **Frontend**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Dashboard**: https://yourdomain.com/dashboard
- **Admin**: https://app.supabase.com/project/[YOUR-PROJECT]

**Key Features Enabled:**
✅ User Registration & Authentication
✅ Digital Personality Creation
✅ Voice Recording & Processing
✅ AI-Powered Conversations
✅ Family Member Management
✅ Cloud Storage Integration
✅ Real-time Chat Interface
✅ Mobile-Responsive Design

---

## 📞 Support & Maintenance

For ongoing support:
1. Monitor Supabase Dashboard daily
2. Check Vercel deployments weekly
3. Review usage metrics monthly
4. Update dependencies quarterly

**Emergency Contacts:**
- Supabase Support: support@supabase.com
- Vercel Support: support@vercel.com
- OpenAI Support: help@openai.com

---

**🌟 Congratulations! Your Eternal Platform is now live and ready to preserve digital legacies for families worldwide.**