#!/bin/bash

# =============================================
# GMAH Platform - Script de démarrage rapide
# =============================================

echo "🚀 GMAH Platform - Démarrage..."
echo "================================"

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier Node.js
echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé!${NC}"
    echo "Installer Node.js 18+ depuis: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Vérifier PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas installé localement${NC}"
    echo "Utilisation de Docker pour PostgreSQL..."
    USE_DOCKER_DB=true
else
    echo -e "${GREEN}✅ PostgreSQL installé${NC}"
    USE_DOCKER_DB=false
fi

# Vérifier si .env existe
if [ ! -f "apps/api/.env" ]; then
    echo -e "${YELLOW}📝 Création du fichier .env...${NC}"
    cp .env.example apps/api/.env
    echo -e "${YELLOW}⚠️  Veuillez configurer apps/api/.env avec vos valeurs${NC}"
    echo "Notamment:"
    echo "  - DATABASE_URL"
    echo "  - JWT_SECRET (générer avec: openssl rand -base64 32)"
    echo "  - RESEND_API_KEY (optionnel pour les emails)"
    read -p "Appuyez sur Entrée après avoir configuré .env..."
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo -e "${YELLOW}📝 Création du fichier .env.local pour le frontend...${NC}"
    cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_APP_URL=http://localhost:3001
EOF
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
    npm install
fi

# Démarrer PostgreSQL avec Docker si nécessaire
if [ "$USE_DOCKER_DB" = true ]; then
    echo -e "${YELLOW}🐳 Démarrage de PostgreSQL avec Docker...${NC}"
    docker-compose up -d postgres
    sleep 5
fi

# Démarrer Redis avec Docker (optionnel)
echo -e "${YELLOW}🔄 Démarrage de Redis (optionnel)...${NC}"
docker-compose up -d redis 2>/dev/null || echo -e "${YELLOW}Redis non disponible (optionnel)${NC}"

# Vérifier/créer la base de données
echo -e "${YELLOW}🗄️  Configuration de la base de données...${NC}"
cd apps/api

# Créer la DB si elle n'existe pas
if [ "$USE_DOCKER_DB" = true ]; then
    docker exec -it gmah-postgres psql -U postgres -c "CREATE DATABASE gmah_db;" 2>/dev/null || echo "DB déjà existante"
else
    createdb gmah_db 2>/dev/null || echo "DB déjà existante"
fi

# Migrations Prisma
echo -e "${YELLOW}🔄 Application des migrations...${NC}"
npx prisma migrate deploy 2>/dev/null || npx prisma db push

# Générer le client Prisma
npx prisma generate

cd ../..

# Démarrer les services
echo -e "${GREEN}✨ Démarrage de GMAH Platform!${NC}"
echo "================================"
echo -e "${GREEN}📍 URLs:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:3001${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:3333${NC}"
echo -e "  Swagger:  ${GREEN}http://localhost:3333/api${NC}"
echo "================================"
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter${NC}"
echo ""

# Démarrer en mode dev
npm run dev