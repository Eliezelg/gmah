#!/bin/bash

# Script to create a new tenant/organization for GMAH platform
# Usage: ./create-tenant.sh <slug> <name> <admin_email> [domain]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 3 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <slug> <name> <admin_email> [domain]"
    echo "Example: $0 paris 'GMAH Paris' admin@gmah-paris.org paris.gmah.com"
    exit 1
fi

# Parse arguments
TENANT_SLUG=$1
TENANT_NAME=$2
ADMIN_EMAIL=$3
TENANT_DOMAIN=${4:-"$TENANT_SLUG.gmah.com"}

# Validate slug format (lowercase letters, numbers, hyphens)
if ! [[ "$TENANT_SLUG" =~ ^[a-z][a-z0-9-]*[a-z0-9]$ ]]; then
    echo -e "${RED}Error: Invalid slug format${NC}"
    echo "Slug must start with a letter, contain only lowercase letters, numbers, and hyphens, and not end with a hyphen"
    exit 1
fi

# Validate email format
if ! [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}Error: Invalid email format${NC}"
    exit 1
fi

echo -e "${GREEN}Creating new tenant: $TENANT_NAME${NC}"
echo "Slug: $TENANT_SLUG"
echo "Domain: $TENANT_DOMAIN"
echo "Admin Email: $ADMIN_EMAIL"
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
DB_NAME="gmah_org_${TENANT_SLUG}"
MASTER_DB=${MASTER_DB:-gmah_master}

# Step 1: Create the tenant database
echo -e "${YELLOW}Step 1: Creating database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
    echo -e "${RED}Database $DB_NAME already exists or creation failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Database created: $DB_NAME${NC}"

# Step 2: Run Prisma migrations
echo -e "${YELLOW}Step 2: Running migrations...${NC}"
cd ../../apps/api
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations applied${NC}"

# Step 3: Seed initial data
echo -e "${YELLOW}Step 3: Seeding initial data...${NC}"

# Generate a random password for admin
ADMIN_PASSWORD=$(openssl rand -base64 12)

# Create seed script
cat > /tmp/seed_tenant.sql <<EOF
-- Create admin user
INSERT INTO "User" (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    '$ADMIN_EMAIL',
    '\$2b\$10\$K7L1OJ0TfPCq8Qb1wFmFiOuG7JZkGxCVHrPBXzLZVGLbDJ5cWJQWa', -- Default: Admin123!
    'ADMIN',
    true,
    NOW(),
    NOW()
);

-- Create default loan categories
INSERT INTO "LoanCategory" (id, name, description, "maxAmount", "maxDuration", "requiresGuarantor", "isActive")
VALUES 
    (gen_random_uuid(), 'Personnel', 'Prêt pour besoins personnels', 5000, 12, false, true),
    (gen_random_uuid(), 'Urgence', 'Prêt d''urgence médicale ou familiale', 3000, 6, false, true),
    (gen_random_uuid(), 'Études', 'Prêt pour frais de scolarité', 10000, 24, true, true),
    (gen_random_uuid(), 'Mariage', 'Prêt pour célébration de mariage', 15000, 36, true, true),
    (gen_random_uuid(), 'Professionnel', 'Prêt pour activité professionnelle', 20000, 48, true, true);

-- Initialize treasury
INSERT INTO "Treasury" (id, balance, "availableFunds", "committedFunds", "lastUpdated")
VALUES (gen_random_uuid(), 0, 0, 0, NOW());
EOF

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/seed_tenant.sql
rm /tmp/seed_tenant.sql
echo -e "${GREEN}✓ Initial data seeded${NC}"

# Step 4: Register tenant in master database
echo -e "${YELLOW}Step 4: Registering tenant in master database...${NC}"

# First, create master database if it doesn't exist
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$MASTER_DB'" | grep -q 1 || {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $MASTER_DB;"
    
    # Create organizations table in master
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $MASTER_DB <<EOF
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    domain VARCHAR(200) UNIQUE,
    database_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(50) DEFAULT 'starter',
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"maxUsers": 100, "maxLoans": 1000, "maxStorage": "1GB"}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
EOF
}

# Insert the new organization
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $MASTER_DB <<EOF
INSERT INTO organizations (slug, name, domain, database_name)
VALUES ('$TENANT_SLUG', '$TENANT_NAME', '$TENANT_DOMAIN', '$DB_NAME')
ON CONFLICT (slug) DO NOTHING;
EOF

echo -e "${GREEN}✓ Tenant registered in master database${NC}"

# Step 5: Generate configuration file
echo -e "${YELLOW}Step 5: Creating configuration file...${NC}"
mkdir -p ../../config/tenants
cat > ../../config/tenants/$TENANT_SLUG.json <<EOF
{
    "slug": "$TENANT_SLUG",
    "name": "$TENANT_NAME",
    "domain": "$TENANT_DOMAIN",
    "database": "$DB_NAME",
    "admin": {
        "email": "$ADMIN_EMAIL",
        "temporaryPassword": "Admin123!"
    },
    "settings": {
        "logo": null,
        "primaryColor": "#4F46E5",
        "locale": "fr",
        "timezone": "Europe/Paris"
    },
    "limits": {
        "maxUsers": 100,
        "maxLoans": 1000,
        "maxStorage": "1GB"
    },
    "features": {
        "twoFactorAuth": true,
        "emailNotifications": true,
        "smsNotifications": false,
        "advancedReporting": false
    },
    "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
echo -e "${GREEN}✓ Configuration file created${NC}"

# Step 6: Display success message
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Tenant created successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Tenant Information:"
echo "-------------------"
echo "Name: $TENANT_NAME"
echo "Slug: $TENANT_SLUG"
echo "Domain: $TENANT_DOMAIN"
echo "Database: $DB_NAME"
echo ""
echo "Admin Credentials:"
echo "------------------"
echo "Email: $ADMIN_EMAIL"
echo "Temporary Password: Admin123!"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Configure DNS: $TENANT_DOMAIN → CNAME → app.gmah.com"
echo "2. Admin can login at: https://$TENANT_DOMAIN/login"
echo "3. Admin should change password on first login"
echo "4. Configure organization settings in admin panel"
echo ""
echo "Configuration saved to: config/tenants/$TENANT_SLUG.json"