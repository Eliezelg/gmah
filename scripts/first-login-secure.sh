#!/bin/bash

# ================================================================================
# PREMIÈRE CONNEXION - SÉCURISATION IMMÉDIATE
# ================================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║         SÉCURISATION IMMÉDIATE DE VOTRE VPS                     ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"

# 1. Changer le mot de passe root
echo -e "${BLUE}[1/5]${NC} Changement du mot de passe root..."
passwd root

# 2. Créer un utilisateur admin
echo -e "${BLUE}[2/5]${NC} Création d'un utilisateur administrateur..."
read -p "Nom du nouvel utilisateur admin: " NEW_USER
adduser "$NEW_USER"
usermod -aG sudo "$NEW_USER"

# 3. Générer une clé SSH
echo -e "${BLUE}[3/5]${NC} Configuration de l'authentification SSH par clé..."
echo -e "${YELLOW}Sur votre machine locale, exécutez:${NC}"
echo -e "${GREEN}ssh-keygen -t ed25519 -C 'your-email@example.com'${NC}"
echo -e "${GREEN}ssh-copy-id $NEW_USER@91.98.131.130${NC}"
echo ""
read -p "Appuyez sur Entrée quand c'est fait..."

# 4. Sécuriser SSH
echo -e "${BLUE}[4/5]${NC} Sécurisation de SSH..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat >> /etc/ssh/sshd_config << EOF

# GMAH Security Settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers $NEW_USER
EOF

# 5. Configurer le firewall de base
echo -e "${BLUE}[5/5]${NC} Configuration du firewall..."
apt-get update && apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

systemctl restart sshd

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SÉCURISATION TERMINÉE !                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo -e "1. Notez votre nouveau mot de passe root"
echo -e "2. Connectez-vous maintenant avec: ${GREEN}ssh $NEW_USER@91.98.131.130${NC}"
echo -e "3. Root login est maintenant désactivé"
echo -e "4. Seule l'authentification par clé SSH est autorisée"
echo ""
echo -e "${RED}NE FERMEZ PAS cette session avant d'avoir testé la nouvelle connexion !${NC}"