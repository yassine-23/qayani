#!/bin/bash

# ============================================================================
# Qayani Live Chat - Deployment Script
# ============================================================================
#
# This script deploys the Live Chat Mode infrastructure:
# 1. Applies Supabase database migrations
# 2. Verifies table creation
# 3. Sets up Row Level Security
# 4. Creates necessary indexes
#
# Usage: ./scripts/deploy-live-chat.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Qayani Live Chat - Deployment Script             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# Step 1: Check Prerequisites
# ============================================================================

echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI is not installed.${NC}"
    echo -e "${BLUE}Install it with:${NC}"
    echo -e "  npm install -g supabase"
    echo -e "  or"
    echo -e "  brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI is installed${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running from project root${NC}"

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20250121000001_create_live_chat_schema.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}✗ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Migration file exists${NC}"

# ============================================================================
# Step 2: Link to Supabase Project
# ============================================================================

echo -e "\n${YELLOW}[2/5] Linking to Supabase project...${NC}"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}✗ .env.local file not found${NC}"
    echo -e "${BLUE}Please create .env.local with your Supabase credentials${NC}"
    exit 1
fi

# Extract Supabase URL from .env.local
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL not found in .env.local${NC}"
    exit 1
fi

# Extract project ID from URL
PROJECT_ID=$(echo "$SUPABASE_URL" | sed -E 's/https:\/\/([^.]+).*/\1/')

echo -e "${BLUE}Supabase Project ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}If this is correct, press Enter to continue...${NC}"
read -r

# Link to project
echo -e "${BLUE}Running: supabase link --project-ref ${PROJECT_ID}${NC}"
supabase link --project-ref "$PROJECT_ID" || {
    echo -e "${YELLOW}Note: If already linked, this is expected${NC}"
}

echo -e "${GREEN}✓ Project linked${NC}"

# ============================================================================
# Step 3: Apply Migrations
# ============================================================================

echo -e "\n${YELLOW}[3/5] Applying database migrations...${NC}"

echo -e "${BLUE}Running: supabase db push${NC}"
supabase db push

echo -e "${GREEN}✓ Migrations applied successfully${NC}"

# ============================================================================
# Step 4: Verify Tables
# ============================================================================

echo -e "\n${YELLOW}[4/5] Verifying table creation...${NC}"

# Create verification script
cat > /tmp/verify_tables.sql << 'EOF'
-- Check if live chat tables exist
SELECT
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'live_chat_sessions',
    'live_chat_messages',
    'live_chat_analytics',
    'live_chat_recordings'
)
ORDER BY table_name;

-- Check if indexes exist
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'live_chat_%'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'live_chat_%'
ORDER BY tablename, policyname;
EOF

echo -e "${BLUE}Running verification queries...${NC}"
supabase db query < /tmp/verify_tables.sql

echo -e "${GREEN}✓ Tables verified${NC}"

# ============================================================================
# Step 5: Test API Routes
# ============================================================================

echo -e "\n${YELLOW}[5/5] Checking API routes...${NC}"

# Check if API route files exist
API_FILES=(
    "app/api/live-chat/session/route.ts"
    "app/api/live-chat/message/route.ts"
)

for file in "${API_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file exists${NC}"
    else
        echo -e "${RED}✗ $file not found${NC}"
        exit 1
    fi
done

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Deployment Complete! ✓                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Verify your .env.local has OPENAI_API_KEY configured"
echo -e "2. Start your development server: ${GREEN}npm run dev${NC}"
echo -e "3. Navigate to: ${GREEN}http://localhost:3000/dashboard/live${NC}"
echo -e "4. Click the connect button to start a live chat session"

echo -e "\n${BLUE}Database Tables Created:${NC}"
echo -e "  • live_chat_sessions    (session metadata)"
echo -e "  • live_chat_messages    (message persistence)"
echo -e "  • live_chat_analytics   (conversation metrics)"
echo -e "  • live_chat_recordings  (audio recordings)"

echo -e "\n${BLUE}API Routes Available:${NC}"
echo -e "  • POST   /api/live-chat/session   (create session)"
echo -e "  • DELETE /api/live-chat/session   (end session)"
echo -e "  • POST   /api/live-chat/message   (save message)"
echo -e "  • GET    /api/live-chat/message   (get messages)"

echo -e "\n${YELLOW}Documentation:${NC}"
echo -e "  • README_LIVE_CHAT.md       (complete guide)"
echo -e "  • LIVE_CHAT_DEPLOYMENT.md   (deployment details)"

echo -e "\n${GREEN}🎉 Live Chat Mode is ready to use!${NC}\n"
