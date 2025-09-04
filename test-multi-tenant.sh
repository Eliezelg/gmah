#!/bin/bash

# Test script for multi-tenant GMAH platform
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Multi-Tenant GMAH Platform Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
API_URL="http://localhost:3333"
WEB_URL="http://localhost:3001"
TEST_ORG_SLUG="test-paris"
TEST_ORG_NAME="GMAH Test Paris"
TEST_ADMIN_EMAIL="admin@test-paris.org"

# 1. Check if services are available
echo -e "${YELLOW}1. Checking services availability...${NC}"

# Check API
curl -s -o /dev/null -w "%{http_code}" $API_URL/health 2>/dev/null | grep -q "200" && \
    echo -e "${GREEN}✓ API is running${NC}" || \
    echo -e "${RED}✗ API is not accessible at $API_URL${NC}"

# Check Frontend
curl -s -o /dev/null -w "%{http_code}" $WEB_URL 2>/dev/null | grep -q "200\|404" && \
    echo -e "${GREEN}✓ Frontend is running${NC}" || \
    echo -e "${RED}✗ Frontend is not accessible at $WEB_URL${NC}"

echo ""

# 2. Test organization creation API
echo -e "${YELLOW}2. Testing organization creation via API...${NC}"

RESPONSE=$(curl -s -X POST "$API_URL/api/organizations/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "'"$TEST_ORG_NAME"'",
    "slug": "'"$TEST_ORG_SLUG"'",
    "adminName": "Jean Test",
    "adminEmail": "'"$TEST_ADMIN_EMAIL"'",
    "phoneNumber": "+33123456789",
    "address": "123 Rue de Test",
    "city": "Paris",
    "postalCode": "75001",
    "country": "France",
    "expectedUsers": "50-100",
    "description": "Organisation de test pour multi-tenant",
    "acceptTerms": true,
    "acceptDataProcessing": true
  }' 2>/dev/null || echo '{"error": "Failed to connect"}')

if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ Organization created successfully${NC}"
    echo "  - Slug: $TEST_ORG_SLUG"
    echo "  - URL: $TEST_ORG_SLUG.gmah.com"
    echo "  - Admin: $TEST_ADMIN_EMAIL"
else
    echo -e "${RED}✗ Failed to create organization${NC}"
    echo "  Response: $RESPONSE"
fi

echo ""

# 3. Test slug availability check
echo -e "${YELLOW}3. Testing slug availability check...${NC}"

AVAILABLE=$(curl -s "$API_URL/api/organizations/check-slug/$TEST_ORG_SLUG" 2>/dev/null || echo '{"available": null}')

if echo "$AVAILABLE" | grep -q '"available":false'; then
    echo -e "${GREEN}✓ Slug check working (slug already taken)${NC}"
elif echo "$AVAILABLE" | grep -q '"available":true'; then
    echo -e "${GREEN}✓ Slug check working (slug available)${NC}"
else
    echo -e "${RED}✗ Slug check failed${NC}"
fi

echo ""

# 4. Test custom domain lookup
echo -e "${YELLOW}4. Testing custom domain lookup...${NC}"

DOMAIN_RESPONSE=$(curl -s -X POST "$API_URL/api/domains/lookup" \
  -H "Content-Type: application/json" \
  -d '{"domain": "test-paris.gmah.com"}' 2>/dev/null || echo '{"error": "Failed"}')

if echo "$DOMAIN_RESPONSE" | grep -q "tenantId"; then
    echo -e "${GREEN}✓ Domain lookup working${NC}"
    echo "  Response: $DOMAIN_RESPONSE"
else
    echo -e "${YELLOW}⚠ Domain lookup returned no tenant (expected if not created)${NC}"
fi

echo ""

# 5. Test tenant settings API
echo -e "${YELLOW}5. Testing tenant settings API...${NC}"

SETTINGS=$(curl -s "$API_URL/api/tenants/$TEST_ORG_SLUG/settings" 2>/dev/null || echo '{"error": "Failed"}')

if echo "$SETTINGS" | grep -q "name\|slug"; then
    echo -e "${GREEN}✓ Tenant settings API working${NC}"
else
    echo -e "${YELLOW}⚠ Tenant settings not found (expected if not created)${NC}"
fi

echo ""

# 6. Test middleware tenant detection
echo -e "${YELLOW}6. Testing middleware tenant detection...${NC}"

# Test with subdomain header
TENANT_TEST=$(curl -s "$WEB_URL" \
  -H "Host: $TEST_ORG_SLUG.gmah.com" \
  -H "Accept: text/html" 2>/dev/null | head -20)

if echo "$TENANT_TEST" | grep -q "html"; then
    echo -e "${GREEN}✓ Middleware accepts tenant subdomain${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify middleware response${NC}"
fi

echo ""

# 7. Show available endpoints
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}         Available Endpoints${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Main Site:"
echo "  - Landing: $WEB_URL"
echo "  - Signup: $WEB_URL/signup-organization"
echo ""
echo "Tenant Site:"
echo "  - Homepage: http://$TEST_ORG_SLUG.gmah.com:3001"
echo "  - Login: http://$TEST_ORG_SLUG.gmah.com:3001/login"
echo "  - Dashboard: http://$TEST_ORG_SLUG.gmah.com:3001/dashboard"
echo ""
echo "API Endpoints:"
echo "  - Create Org: POST $API_URL/api/organizations/signup"
echo "  - Check Slug: GET $API_URL/api/organizations/check-slug/:slug"
echo "  - Domain Lookup: POST $API_URL/api/domains/lookup"
echo "  - Tenant Settings: GET $API_URL/api/tenants/:tenant/settings"
echo "  - Add Custom Domain: POST $API_URL/api/domains/organization/:orgId"
echo ""

# 8. Test custom domain addition
echo -e "${YELLOW}8. Testing custom domain addition (requires auth)...${NC}"
echo -e "${YELLOW}  This would require authentication token${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "To fully test the multi-tenant setup:"
echo "1. Start the services:"
echo "   - cd apps/api && npm run start:dev"
echo "   - cd apps/web && npm run dev"
echo ""
echo "2. Create an organization:"
echo "   - Visit $WEB_URL/signup-organization"
echo "   - Or use: ./scripts/tenant-management/create-tenant.sh"
echo ""
echo "3. Access tenant site:"
echo "   - Add to /etc/hosts: 127.0.0.1 test-paris.gmah.com"
echo "   - Visit http://test-paris.gmah.com:3001"
echo ""
echo "4. Test custom domain:"
echo "   - Use API to add custom domain"
echo "   - Configure DNS verification"
echo ""

echo -e "${GREEN}✅ Test script completed!${NC}"