#!/bin/bash

# Script to backup a tenant database
# Usage: ./backup-tenant.sh <slug>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 1 ]; then
    echo -e "${RED}Error: Missing tenant slug${NC}"
    echo "Usage: $0 <slug>"
    echo "Example: $0 paris"
    exit 1
fi

TENANT_SLUG=$1
DATE=$(date +%Y%m%d_%H%M%S)

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

# Create backups directory if it doesn't exist
BACKUP_DIR="../../backups/tenants/$TENANT_SLUG"
mkdir -p $BACKUP_DIR

# Backup filename
BACKUP_FILE="$BACKUP_DIR/${TENANT_SLUG}_${DATE}.sql"
BACKUP_COMPRESSED="$BACKUP_DIR/${TENANT_SLUG}_${DATE}.sql.gz"

echo -e "${YELLOW}Starting backup for tenant: $TENANT_SLUG${NC}"
echo "Database: $DB_NAME"
echo "Backup location: $BACKUP_COMPRESSED"
echo ""

# Check if database exists
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME || {
    echo -e "${RED}Error: Database $DB_NAME does not exist${NC}"
    exit 1
}

# Perform backup
echo -e "${YELLOW}Creating backup...${NC}"
PGPASSWORD=$DB_PASSWORD pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --if-exists \
    --format=plain \
    --encoding=UTF8 \
    > $BACKUP_FILE

# Compress the backup
echo -e "${YELLOW}Compressing backup...${NC}"
gzip -9 $BACKUP_FILE

# Get backup size
BACKUP_SIZE=$(ls -lh $BACKUP_COMPRESSED | awk '{print $5}')

# Create metadata file
cat > "$BACKUP_DIR/${TENANT_SLUG}_${DATE}.meta.json" <<EOF
{
    "tenant": "$TENANT_SLUG",
    "database": "$DB_NAME",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "file": "${TENANT_SLUG}_${DATE}.sql.gz",
    "size": "$BACKUP_SIZE",
    "host": "$DB_HOST",
    "port": $DB_PORT,
    "user": "$DB_USER"
}
EOF

# Clean up old backups (keep last 30 days)
echo -e "${YELLOW}Cleaning old backups...${NC}"
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find $BACKUP_DIR -name "*.sql.gz" | wc -l)

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Backup Details:"
echo "---------------"
echo "Tenant: $TENANT_SLUG"
echo "Database: $DB_NAME"
echo "Backup File: $BACKUP_COMPRESSED"
echo "Size: $BACKUP_SIZE"
echo "Total Backups: $BACKUP_COUNT"
echo ""
echo "To restore this backup, use:"
echo "./restore-tenant.sh $TENANT_SLUG $DATE"