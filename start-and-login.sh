#!/bin/bash

echo "🚀 Démarrage de la plateforme GMAH..."
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si PostgreSQL est en cours d'exécution
echo -e "${BLUE}📊 Vérification de PostgreSQL...${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL est actif${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas actif. Démarrage...${NC}"
    sudo systemctl start postgresql
fi

# Vérifier si la base de données existe
echo -e "${BLUE}🗄️  Vérification de la base de données...${NC}"
PGPASSWORD=postgres psql -U postgres -h localhost -lqt | cut -d \| -f 1 | grep -qw gmah_db
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de données gmah_db existe${NC}"
else
    echo -e "${YELLOW}⚠️  Création de la base de données...${NC}"
    PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE gmah_db;"
fi

# Se déplacer dans le répertoire du projet
cd /home/eli/Documents/Gmah/gmah-platform

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installation des dépendances...${NC}"
    npm install
fi

# Appliquer les migrations Prisma
echo -e "${BLUE}🔄 Application des migrations Prisma...${NC}"
cd apps/api
npx prisma migrate deploy 2>/dev/null || npx prisma db push
npx prisma generate

# Exécuter le seed pour créer le super admin
echo -e "${BLUE}👤 Création/vérification du super admin...${NC}"
npm run prisma:seed

cd ../..

# Démarrer l'application
echo ""
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo -e "${BLUE}📋 Informations de connexion :${NC}"
echo -e "   Email: ${YELLOW}admin@gmah.org${NC}"
echo -e "   Mot de passe: ${YELLOW}Admin123!@#${NC}"
echo ""
echo -e "${BLUE}🌐 URLs de l'application :${NC}"
echo -e "   Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend API: ${YELLOW}http://localhost:3333${NC}"
echo ""
echo -e "${GREEN}🚀 Démarrage de l'application...${NC}"
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter${NC}"
echo ""

# Démarrer l'application
npm run dev