#!/bin/bash

# =============================================
# GMAH Platform - Script de Health Check
# =============================================
# Vérifie l'état de tous les services
# Usage: ./health-check.sh [--verbose]
# =============================================

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-"http://localhost:3333"}
WEB_URL=${WEB_URL:-"http://localhost:3001"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"gmah_db"}
REDIS_HOST=${REDIS_HOST:-"localhost"}
REDIS_PORT=${REDIS_PORT:-"6379"}

# Mode verbose
VERBOSE=false
if [ "$1" == "--verbose" ] || [ "$1" == "-v" ]; then
    VERBOSE=true
fi

# Compteurs
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

echo "================================================"
echo "       GMAH Platform - Health Check"
echo "================================================"
echo ""

# Fonction pour afficher le statut
print_status() {
    local service=$1
    local status=$2
    local message=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" == "OK" ]; then
        echo -e "${GREEN}✅ $service: OK${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        if [ "$VERBOSE" = true ] && [ -n "$message" ]; then
            echo -e "   ${BLUE}→ $message${NC}"
        fi
    elif [ "$status" == "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $service: WARNING${NC}"
        WARNINGS=$((WARNINGS + 1))
        if [ -n "$message" ]; then
            echo -e "   ${YELLOW}→ $message${NC}"
        fi
    else
        echo -e "${RED}❌ $service: FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        if [ -n "$message" ]; then
            echo -e "   ${RED}→ $message${NC}"
        fi
    fi
}

# Fonction pour vérifier un service HTTP
check_http_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 5)
        if [ "$response" == "$expected_status" ]; then
            if [ "$VERBOSE" = true ]; then
                response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url")
                print_status "$name" "OK" "Response time: ${response_time}s"
            else
                print_status "$name" "OK"
            fi
        else
            print_status "$name" "FAILED" "HTTP Status: $response (expected: $expected_status)"
        fi
    else
        print_status "$name" "WARNING" "curl not installed, skipping HTTP check"
    fi
}

echo "🔍 Checking System Requirements..."
echo "--------------------------------"

# Check Node.js
if command -v node &> /dev/null; then
    node_version=$(node -v)
    print_status "Node.js" "OK" "Version: $node_version"
else
    print_status "Node.js" "FAILED" "Not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    npm_version=$(npm -v)
    print_status "npm" "OK" "Version: $npm_version"
else
    print_status "npm" "FAILED" "Not installed"
fi

echo ""
echo "🗄️  Checking Database..."
echo "--------------------------------"

# Check PostgreSQL connection
if command -v psql &> /dev/null; then
    if PGPASSWORD=${DB_PASSWORD:-postgres} psql -h "$DB_HOST" -p "$DB_PORT" -U ${DB_USER:-postgres} -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
        if [ "$VERBOSE" = true ]; then
            table_count=$(PGPASSWORD=${DB_PASSWORD:-postgres} psql -h "$DB_HOST" -p "$DB_PORT" -U ${DB_USER:-postgres} -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | xargs)
            print_status "PostgreSQL" "OK" "Connected to $DB_NAME (Tables: $table_count)"
        else
            print_status "PostgreSQL" "OK"
        fi
    else
        print_status "PostgreSQL" "FAILED" "Cannot connect to database"
    fi
else
    # Try with Docker
    if docker exec gmah-postgres psql -U postgres -c "SELECT 1" &> /dev/null 2>&1; then
        print_status "PostgreSQL (Docker)" "OK"
    else
        print_status "PostgreSQL" "WARNING" "psql not installed, cannot verify connection"
    fi
fi

echo ""
echo "💾 Checking Cache..."
echo "--------------------------------"

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
        if [ "$VERBOSE" = true ]; then
            memory_usage=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
            print_status "Redis" "OK" "Memory usage: $memory_usage"
        else
            print_status "Redis" "OK"
        fi
    else
        print_status "Redis" "WARNING" "Not running (optional service)"
    fi
else
    # Try with Docker
    if docker exec gmah-redis redis-cli ping &> /dev/null 2>&1; then
        print_status "Redis (Docker)" "OK"
    else
        print_status "Redis" "WARNING" "redis-cli not installed (optional)"
    fi
fi

echo ""
echo "🌐 Checking Services..."
echo "--------------------------------"

# Check Backend API
check_http_service "Backend API" "$API_URL/health" 200

# Check Swagger Documentation
check_http_service "Swagger Docs" "$API_URL/api" 200

# Check Frontend
check_http_service "Frontend" "$WEB_URL" 200

# Check WebSocket (if backend is running)
if curl -s "$API_URL/health" &> /dev/null; then
    if curl -s "$API_URL/socket.io/?EIO=4&transport=polling" | grep -q "0{" &> /dev/null; then
        print_status "WebSocket" "OK"
    else
        print_status "WebSocket" "WARNING" "Socket.io endpoint not responding"
    fi
fi

echo ""
echo "📊 Checking API Endpoints..."
echo "--------------------------------"

# Check critical API endpoints
check_http_service "Auth Endpoint" "$API_URL/api/auth/login" 405  # POST endpoint returns 405 on GET
check_http_service "Users Endpoint" "$API_URL/api/users" 401  # Protected, should return 401
check_http_service "Loans Endpoint" "$API_URL/api/loans" 401  # Protected, should return 401

echo ""
echo "🔍 Checking File System..."
echo "--------------------------------"

# Check required directories
dirs=("apps/api" "apps/web" "node_modules" "apps/api/prisma")
for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_status "Directory: $dir" "OK"
    else
        print_status "Directory: $dir" "FAILED" "Not found"
    fi
done

# Check important files
files=(".env" "package.json" "apps/api/prisma/schema.prisma")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        print_status "File: $file" "OK"
    else
        if [ "$file" == ".env" ]; then
            print_status "File: $file" "WARNING" "Not found - copy from .env.example"
        else
            print_status "File: $file" "FAILED" "Not found"
        fi
    fi
done

echo ""
echo "🚀 Checking Processes..."
echo "--------------------------------"

# Check if services are running
check_process() {
    local name=$1
    local pattern=$2
    
    if pgrep -f "$pattern" > /dev/null; then
        if [ "$VERBOSE" = true ]; then
            pid=$(pgrep -f "$pattern" | head -1)
            print_status "$name" "OK" "PID: $pid"
        else
            print_status "$name" "OK"
        fi
    else
        print_status "$name" "WARNING" "Not running"
    fi
}

check_process "NestJS API" "nest"
check_process "Next.js Frontend" "next"

# Check with PM2 if available
if command -v pm2 &> /dev/null; then
    pm2_status=$(pm2 list --no-color 2>/dev/null | grep -E "gmah-api|gmah-web")
    if [ -n "$pm2_status" ]; then
        print_status "PM2 Services" "OK" "Services managed by PM2"
    fi
fi

# Check Docker containers if Docker is used
if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Checking Docker Containers..."
    echo "--------------------------------"
    
    containers=("gmah-postgres" "gmah-redis" "gmah-api" "gmah-web")
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            print_status "Container: $container" "OK"
        else
            if docker ps -a | grep -q "$container"; then
                print_status "Container: $container" "WARNING" "Exists but not running"
            fi
        fi
    done
fi

echo ""
echo "================================================"
echo "              HEALTH CHECK SUMMARY"
echo "================================================"
echo -e "Total Checks:    $TOTAL_CHECKS"
echo -e "${GREEN}Passed:          $PASSED_CHECKS${NC}"
echo -e "${YELLOW}Warnings:        $WARNINGS${NC}"
echo -e "${RED}Failed:          $FAILED_CHECKS${NC}"
echo ""

# Determine overall status
if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ SYSTEM STATUS: HEALTHY${NC}"
        echo "All systems operational!"
        exit 0
    else
        echo -e "${YELLOW}⚠️  SYSTEM STATUS: OPERATIONAL WITH WARNINGS${NC}"
        echo "System is running but some optional services may need attention."
        exit 0
    fi
else
    echo -e "${RED}❌ SYSTEM STATUS: UNHEALTHY${NC}"
    echo "Critical services are failing. Please check the errors above."
    echo ""
    echo "Quick fixes:"
    echo "1. Make sure all services are started: npm run dev"
    echo "2. Check database connection: docker-compose up -d postgres"
    echo "3. Copy environment file: cp .env.example .env"
    echo "4. Install dependencies: npm install"
    exit 1
fi