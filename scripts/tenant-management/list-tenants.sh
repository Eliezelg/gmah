#!/bin/bash

# Script to list all tenants
# Usage: ./list-tenants.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}GMAH Platform - Tenant List${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Check if master database exists
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$MASTER_DB'" | grep -q 1 || {
    echo -e "${YELLOW}Master database not found. No tenants registered.${NC}"
    exit 0
}

# Get tenant list with details
TENANT_DATA=$(PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $MASTER_DB \
    -t \
    --csv \
    -c "SELECT slug, name, domain, status, plan, created_at FROM organizations ORDER BY created_at DESC;")

if [ -z "$TENANT_DATA" ]; then
    echo -e "${YELLOW}No tenants found${NC}"
    exit 0
fi

# Display header
printf "${CYAN}%-15s %-30s %-30s %-10s %-10s %-20s${NC}\n" "SLUG" "NAME" "DOMAIN" "STATUS" "PLAN" "CREATED"
echo "--------------------------------------------------------------------------------------------------------"

# Process and display each tenant
echo "$TENANT_DATA" | while IFS=',' read -r slug name domain status plan created_at; do
    # Remove quotes if present
    slug=$(echo $slug | tr -d '"')
    name=$(echo $name | tr -d '"')
    domain=$(echo $domain | tr -d '"')
    status=$(echo $status | tr -d '"')
    plan=$(echo $plan | tr -d '"')
    created_at=$(echo $created_at | tr -d '"' | cut -d' ' -f1)
    
    # Color code status
    if [ "$status" = "active" ]; then
        status_color="${GREEN}"
    elif [ "$status" = "suspended" ]; then
        status_color="${YELLOW}"
    else
        status_color="${RED}"
    fi
    
    printf "%-15s %-30s %-30s ${status_color}%-10s${NC} %-10s %-20s\n" "$slug" "$name" "$domain" "$status" "$plan" "$created_at"
done

echo ""

# Get statistics
ACTIVE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $MASTER_DB -t -c "SELECT COUNT(*) FROM organizations WHERE status='active';")
TOTAL_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $MASTER_DB -t -c "SELECT COUNT(*) FROM organizations;")

echo "--------------------------------------------------------------------------------------------------------"
echo -e "${GREEN}Statistics:${NC}"
echo "Total Organizations: $TOTAL_COUNT"
echo "Active Organizations: $ACTIVE_COUNT"
echo ""

# Show available commands
echo -e "${CYAN}Available commands:${NC}"
echo "  ./create-tenant.sh <slug> <name> <email>     - Create new tenant"
echo "  ./backup-tenant.sh <slug>                     - Backup tenant database"
echo "  ./restore-tenant.sh <slug> <date>             - Restore tenant from backup"
echo "  ./migrate-all-tenants.sh                      - Run migrations on all tenants"
echo "  ./delete-tenant.sh <slug>                     - Delete tenant (use with caution)"