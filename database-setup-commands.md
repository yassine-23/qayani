# Database Setup Commands

## Quick Setup Guide

### 1. Get your Supabase credentials:

**API Settings Page:**
https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/api

Copy these keys:
- `anon` `public` key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → Use for `SUPABASE_SERVICE_KEY`

**Database Settings Page:**
https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/database

Get your database password or connection string.

### 2. Update .env.local file:

Replace these lines in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_KEY=your_actual_service_key_here
```

### 3. Set up database connection:

Your database URL format will be:
```bash
SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.bkpyrvmptpncujciueyc.supabase.co:5432/postgres"
```

### 4. Deploy the database schema:

```bash
# Option 1: Using our setup script (recommended)
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.bkpyrvmptpncujciueyc.supabase.co:5432/postgres"
./setup-db.sh

# Option 2: Direct psql command
psql "postgresql://postgres:[YOUR-PASSWORD]@db.bkpyrvmptpncujciueyc.supabase.co:5432/postgres" -f deploy-schema.sql
```

### 5. Test your setup:

```bash
# Start the development server
npm run dev

# Test API endpoints
curl http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","fullName":"Test User"}'
```

## Troubleshooting

### If you get connection errors:
1. Check your database password is correct
2. Ensure the connection string format is exact
3. Verify your IP is allowed (Supabase usually allows all by default)

### If you get authentication errors:
1. Make sure the anon key is correct in .env.local
2. Check that the service role key is correct
3. Restart your dev server after updating .env.local

### If database deployment fails:
1. Check the database is accessible
2. Ensure you have the correct permissions
3. Try running the SQL commands manually in the Supabase SQL editor

## Next Steps After Setup

1. **Test Authentication**: Create a user account through the app
2. **Test Personalities**: Create a digital personality
3. **Test Chat**: Have a conversation with the AI
4. **Deploy to Production**: Use Vercel for deployment

Your Eternal Platform will be fully functional once these steps are complete!