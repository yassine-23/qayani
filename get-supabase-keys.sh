#!/bin/bash

# Eternal Platform - Supabase API Keys Helper
# This script helps you get your API keys from the Supabase dashboard

set -e

echo "🔑 Eternal Platform - Supabase Configuration Helper"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Your Supabase Project Details:${NC}"
echo -e "   Project ID: bkpyrvmptpncujciueyc"
echo -e "   Project URL: https://bkpyrvmptpncujciueyc.supabase.co"
echo -e "   Dashboard: https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc"
echo ""

echo -e "${YELLOW}🔍 To get your API keys, follow these steps:${NC}"
echo ""

echo -e "${BLUE}Step 1: Get API Keys${NC}"
echo -e "   1. Go to: ${GREEN}https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/api${NC}"
echo -e "   2. Copy the following keys:"
echo -e "      • ${YELLOW}anon public${NC} key"
echo -e "      • ${YELLOW}service_role${NC} key (keep this secret!)"
echo ""

echo -e "${BLUE}Step 2: Database Connection${NC}"
echo -e "   1. Go to: ${GREEN}https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/database${NC}"
echo -e "   2. Copy the ${YELLOW}Connection string${NC} under 'Connection pooling'"
echo -e "   3. Or note your database password if you remember it"
echo ""

echo -e "${BLUE}Step 3: Update Environment File${NC}"
echo -e "   Replace the placeholders in ${GREEN}.env.local${NC} with your actual keys:"
echo ""
echo -e "   ${YELLOW}NEXT_PUBLIC_SUPABASE_ANON_KEY${NC}=your_anon_key_here"
echo -e "   ${YELLOW}SUPABASE_SERVICE_KEY${NC}=your_service_role_key_here"
echo ""

echo -e "${RED}⚠️  Security Note:${NC}"
echo -e "   • Never share your service_role key publicly"
echo -e "   • The anon key is safe for frontend use"
echo -e "   • Keep your database password secure"
echo ""

echo -e "${GREEN}✨ After updating .env.local, run:${NC}"
echo -e "   ${BLUE}./setup-db.sh${NC}  # To deploy the database schema"
echo -e "   ${BLUE}npm run dev${NC}    # To test your application"
echo ""

# Check if user wants to open the dashboard
read -p "Would you like to open the Supabase dashboard now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}📱 Opening Supabase dashboard...${NC}"

    # Try to open the API settings page
    if command -v open >/dev/null 2>&1; then
        open "https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/api"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/api"
    else
        echo -e "${YELLOW}Please manually open:${NC}"
        echo -e "${BLUE}https://supabase.com/dashboard/project/bkpyrvmptpncujciueyc/settings/api${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Once you've updated .env.local, your Eternal Platform will be ready for deployment!${NC}"