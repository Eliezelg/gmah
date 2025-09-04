#!/bin/bash

# Script to restore a tenant database from backup
# Usage: ./restore-tenant.sh <slug> <backup_date>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <slug> <backup_date>"
    echo "Example: $0 paris 20240120_143022"
    echo ""
    echo "To list available backups, use: ./list-backups.sh <slug>"
    exit 1
fi

TENANT_SLUG=$1
BACKUP_DATE=$2

# Load environment variables
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME="gmah_org_${TENANT_SLUG}"

# Backup file location
BACKUP_DIR="../../backups/tenants/$TENANT_SLUG"
BACKUP_FILE="$BACKUP_DIR/${TENANT_SLUG}_${BACKUP_DATE}.sql.gz"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found${NC}"
    echo "Looking for: $BACKUP_FILE"
    echo ""
    echo "Available backups for $TENANT_SLUG:"
    ls -la $BACKUP_DIR/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will restore the database from backup${NC}"
echo "This operation will:"
echo "1. Drop the current database: $DB_NAME"
echo "2. Recreate it from backup: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting restore for tenant: $TENANT_SLUG${NC}"

# Step 1: Create a safety backup first
echo -e "${YELLOW}Step 1: Creating safety backup of current database...${NC}"
SAFETY_BACKUP="$BACKUP_DIR/${TENANT_SLUG}_safety_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD=$DB_PASSWORD pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --no-owner \
    --no-privileges \
    | gzip -9 > $SAFETY_BACKUP 2>/dev/null || {
        echo -e "${YELLOW}Warning: Could not create safety backup (database might not exist)${NC}"
    }

if [ -f "$SAFETY_BACKUP" ]; then
    echo -e "${GREEN}✓ Safety backup created: $SAFETY_BACKUP${NC}"
fi

# Step 2: Drop existing database
echo -e "${YELLOW}Step 2: Dropping existing database...${NC}"
PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
        echo -e "${RED}Error: Failed to drop database${NC}"
        exit 1
    }
echo -e "${GREEN}✓ Database dropped${NC}"

# Step 3: Create new database
echo -e "${YELLOW}Step 3: Creating new database...${NC}"
PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -c "CREATE DATABASE $DB_NAME;" || {
        echo -e "${RED}Error: Failed to create database${NC}"
        exit 1
    }
echo -e "${GREEN}✓ Database created${NC}"

# Step 4: Restore from backup
echo -e "${YELLOW}Step 4: Restoring from backup...${NC}"
gunzip -c $BACKUP_FILE | PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --single-transaction \
    --set ON_ERROR_STOP=on || {
        echo -e "${RED}Error: Restore failed${NC}"
        echo "Attempting to restore safety backup..."
        
        # Try to restore safety backup
        if [ -f "$SAFETY_BACKUP" ]; then
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            gunzip -c $SAFETY_BACKUP | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
            echo -e "${YELLOW}Safety backup restored${NC}"
        fi
        exit 1
    }

echo -e "${GREEN}✓ Database restored from backup${NC}"

# Step 5: Verify restore
echo -e "${YELLOW}Step 5: Verifying restore...${NC}"

# Check table count
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -t \
    -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

# Check user count
USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -t \
    -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")

echo "Tables found: $TABLE_COUNT"
echo "Users found: $USER_COUNT"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Restore Details:"
echo "----------------"
echo "Tenant: $TENANT_SLUG"
echo "Database: $DB_NAME"
echo "Restored from: $BACKUP_FILE"
echo "Safety backup: $SAFETY_BACKUP"
echo ""
echo "Database Statistics:"
echo "-------------------"
echo "Tables: $TABLE_COUNT"
echo "Users: $USER_COUNT"
echo ""
echo -e "${YELLOW}Note: You may need to restart the application for changes to take effect${NC}"