#!/bin/bash

# Script to run Prisma migrations on all tenant databases
# Usage: ./migrate-all-tenants.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Migrating all tenant databases${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Load environment variables
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
MASTER_DB=${MASTER_DB:-gmah_master}

# Get list of active tenants
echo -e "${YELLOW}Fetching active tenants...${NC}"
TENANTS=$(PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $MASTER_DB \
    -t \
    -c "SELECT slug FROM organizations WHERE status='active';" 2>/dev/null) || {
        echo -e "${RED}Error: Could not fetch tenants from master database${NC}"
        echo "Make sure the master database exists and has the organizations table"
        exit 1
    }

if [ -z "$TENANTS" ]; then
    echo -e "${YELLOW}No active tenants found${NC}"
    exit 0
fi

# Count tenants
TENANT_COUNT=$(echo "$TENANTS" | wc -w)
echo -e "${GREEN}Found $TENANT_COUNT active tenant(s)${NC}"
echo ""

# Navigate to API directory
cd ../../apps/api

# Migrate each tenant
MIGRATED=0
FAILED=0
FAILED_TENANTS=""

for TENANT in $TENANTS; do
    TENANT=$(echo $TENANT | tr -d '[:space:]')
    DB_NAME="gmah_org_${TENANT}"
    
    echo -e "${YELLOW}Migrating tenant: $TENANT${NC}"
    echo "Database: $DB_NAME"
    
    # Run Prisma migration
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" \
    npx prisma migrate deploy 2>/dev/null && {
        echo -e "${GREEN}✓ $TENANT migrated successfully${NC}"
        ((MIGRATED++))
    } || {
        echo -e "${RED}✗ $TENANT migration failed${NC}"
        ((FAILED++))
        FAILED_TENANTS="$FAILED_TENANTS $TENANT"
    }
    echo ""
done

# Summary
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Migration Summary${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Total tenants: $TENANT_COUNT"
echo -e "${GREEN}Successfully migrated: $MIGRATED${NC}"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed migrations: $FAILED${NC}"
    echo -e "${RED}Failed tenants: $FAILED_TENANTS${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All migrations completed successfully!${NC}"
fi