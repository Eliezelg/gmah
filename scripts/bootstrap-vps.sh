#!/bin/bash

# ================================================================================
# GMAH PLATFORM - BOOTSTRAP VPS SCRIPT
# ================================================================================
# Description: Script d'amorçage pour déployer GMAH sur un nouveau VPS
# Usage: 
#   wget https://raw.githubusercontent.com/Eliezelg/gmah/main/scripts/bootstrap-vps.sh
#   chmod +x bootstrap-vps.sh
#   sudo ./bootstrap-vps.sh
# ================================================================================

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
REPO_URL="${REPO_URL:-https://github.com/Eliezelg/gmah.git}"
INSTALL_DIR="/opt/gmah"
BRANCH="${BRANCH:-main}"

# Banner
show_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                    GMAH PLATFORM - VPS BOOTSTRAP                             ║
║                         Initialisation du serveur                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Vérification root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}[ERROR]${NC} Ce script doit être exécuté en tant que root"
        echo "Utilisez: sudo $0"
        exit 1
    fi
}

# Installation des dépendances de base
install_base_dependencies() {
    echo -e "${BLUE}[1/5]${NC} Installation des dépendances de base..."
    
    # Mise à jour du système
    apt-get update
    
    # Installation des outils essentiels
    apt-get install -y \
        curl \
        wget \
        git \
        sudo \
        ca-certificates \
        gnupg \
        lsb-release \
        software-properties-common \
        apt-transport-https \
        build-essential \
        unzip \
        jq
    
    echo -e "${GREEN}✓${NC} Dépendances de base installées"
}

# Clonage du repository
clone_repository() {
    echo -e "${BLUE}[2/5]${NC} Clonage du repository GMAH..."
    
    # Utiliser l'URL par défaut ou celle fournie
    echo -e "${BLUE}[INFO]${NC} Repository: $REPO_URL"
    
    # Créer le répertoire d'installation
    mkdir -p "$INSTALL_DIR"
    
    # Cloner le repository
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        echo -e "${YELLOW}[INFO]${NC} Repository déjà présent, mise à jour..."
        cd "$INSTALL_DIR"
        git fetch origin
        git reset --hard "origin/$BRANCH"
    else
        echo -e "${BLUE}[INFO]${NC} Clonage depuis $REPO_URL..."
        git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    fi
    
    # Donner les permissions
    cd "$INSTALL_DIR"
    chmod +x scripts/*.sh
    
    echo -e "${GREEN}✓${NC} Repository cloné dans $INSTALL_DIR"
}

# Configuration initiale
initial_configuration() {
    echo -e "${BLUE}[3/5]${NC} Configuration initiale..."
    
    # Créer un fichier de configuration de base
    cat > "$INSTALL_DIR/.env.setup" << EOF
# Configuration GMAH Platform
INSTALL_DIR="$INSTALL_DIR"
SETUP_DATE="$(date +%Y-%m-%d)"
SETUP_USER="$USER"
EOF
    
    # Créer les répertoires nécessaires
    mkdir -p "$INSTALL_DIR"/{logs,backups,data,config}
    
    echo -e "${GREEN}✓${NC} Configuration initiale créée"
}

# Lancement du setup principal
run_main_setup() {
    echo -e "${BLUE}[4/5]${NC} Lancement du setup principal..."
    
    cd "$INSTALL_DIR/scripts"
    
    # Vérifier que les scripts existent
    if [[ ! -f "setup.sh" ]]; then
        echo -e "${RED}[ERROR]${NC} Script setup.sh non trouvé!"
        exit 1
    fi
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}Le repository a été cloné avec succès!${NC}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} Vous pouvez maintenant lancer l'installation:"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}cd $INSTALL_DIR/scripts${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}sudo ./setup.sh${NC}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} Options disponibles:"
    echo -e "${CYAN}║${NC}   ${YELLOW}./setup.sh${NC}          - Installation interactive"
    echo -e "${CYAN}║${NC}   ${YELLOW}./setup.sh --quick${NC}  - Installation rapide"
    echo -e "${CYAN}║${NC}   ${YELLOW}./setup.sh --docker${NC} - Docker uniquement"
    echo -e "${CYAN}║${NC}   ${YELLOW}./setup.sh --help${NC}   - Aide"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Demander si on lance maintenant
    read -p "Voulez-vous lancer l'installation maintenant? (y/n) [y]: " launch_now
    if [[ "${launch_now:-y}" == "y" ]]; then
        ./setup.sh
    else
        echo -e "${YELLOW}[INFO]${NC} Installation reportée. Lancez './setup.sh' quand vous êtes prêt."
    fi
}

# Fonction de nettoyage en cas d'erreur
cleanup_on_error() {
    echo -e "${RED}[ERROR]${NC} Une erreur s'est produite. Nettoyage..."
    # Ne pas supprimer le répertoire au cas où il y a déjà des données
    exit 1
}

# Trap pour les erreurs
trap cleanup_on_error ERR

# ================================================================================
# MAIN
# ================================================================================

main() {
    show_banner
    check_root
    
    echo -e "${BOLD}Préparation du VPS pour GMAH Platform${NC}"
    echo ""
    
    # Si on passe une URL en paramètre
    if [[ -n "${1:-}" ]]; then
        REPO_URL="$1"
    fi
    
    # Étapes d'installation
    install_base_dependencies
    clone_repository
    initial_configuration
    run_main_setup
    
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} Bootstrap terminé!"
}

# Lancement
main "$@"