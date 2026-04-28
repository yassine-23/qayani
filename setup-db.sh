#!/bin/bash

# Eternal Platform Database Setup Script
# This script sets up the Supabase database for production deployment

set -e

echo "🚀 Setting up Eternal Platform Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_DB_URL environment variable is not set${NC}"
    echo -e "${YELLOW}💡 Please set your Supabase database connection string:${NC}"
    echo -e "${BLUE}   export SUPABASE_DB_URL='postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres'${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo -e "   Connection: $(echo $SUPABASE_DB_URL | sed 's/:[^:]*@/@[HIDDEN]@/g')"

# Run the schema deployment
echo -e "${YELLOW}🔧 Deploying database schema...${NC}"

if command -v psql >/dev/null 2>&1; then
    # Use psql directly
    psql "$SUPABASE_DB_URL" -f deploy-schema.sql

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema deployed successfully!${NC}"
    else
        echo -e "${RED}❌ Database schema deployment failed!${NC}"
        exit 1
    fi
else
    # Fallback instruction
    echo -e "${RED}❌ psql command not found${NC}"
    echo -e "${YELLOW}💡 Please install PostgreSQL client or run manually:${NC}"
    echo -e "${BLUE}   psql \"$SUPABASE_DB_URL\" -f deploy-schema.sql${NC}"
    exit 1
fi

# Verify deployment
echo -e "${YELLOW}🔍 Verifying database deployment...${NC}"

VERIFICATION_QUERY="
SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'personalities', 'recordings', 'conversations', 'messages')) as table_count,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'track_usage') as function_count,
    (SELECT name FROM storage.buckets WHERE id = 'recordings') as bucket_name;
"

RESULT=$(psql "$SUPABASE_DB_URL" -t -c "$VERIFICATION_QUERY" 2>/dev/null || echo "verification_failed")

if [[ "$RESULT" == *"verification_failed"* ]]; then
    echo -e "${RED}❌ Database verification failed!${NC}"
    exit 1
elif [[ "$RESULT" == *"recordings"* ]]; then
    echo -e "${GREEN}✅ Database verification successful!${NC}"
    echo -e "${BLUE}📊 Database is ready for production use${NC}"
else
    echo -e "${YELLOW}⚠️  Database verification incomplete - please check manually${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   1. Update your .env.local with production API keys"
echo -e "   2. Deploy your application to Vercel"
echo -e "   3. Configure domain and SSL"
echo -e "   4. Test all API endpoints"
echo ""
echo -e "${YELLOW}🔗 Quick Links:${NC}"
echo -e "   • Supabase Dashboard: https://app.supabase.com/project/[YOUR-PROJECT]"
echo -e "   • Storage Bucket: https://app.supabase.com/project/[YOUR-PROJECT]/storage/buckets"
echo -e "   • Database Schema: https://app.supabase.com/project/[YOUR-PROJECT]/database/tables"
echo ""
echo -e "${GREEN}✨ Your Eternal Platform backend is now ready!${NC}"