#!/bin/bash

# ================================================================================
# GMAH PLATFORM - ULTIMATE SETUP v3.0 COMBINED
# ================================================================================
# Description: Script principal qui combine tous les modules v3
# Usage: ./setup.sh [--interactive] [--config file] [--module name]
# ================================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Banner
show_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║   _____ __  __          _    _   ____  _       _    __                      ║
║  / ____|  \/  |   /\   | |  | | |  _ \| | __ _| |_ / _| ___  _ __ _ __ ___  ║
║ | |  __| \  / |  / /\ \ | |__| | | |_) | |/ _` | __| |_ / _ \| '__| '_ ` _ \ ║
║ | |__| | |  | |/ ____ \| |  | | |  __/| | (_| | |_|  _| (_) | |  | | | | | |║
║  \_____|_|  |_/_/    \_\_|  |_| |_|   |_|\__,_|\__|_|  \___/|_|  |_| |_| |_|║
║                                                                              ║
║                        ULTIMATE SETUP v3.0 - COMBINED                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Chargement des modules
load_modules() {
    echo -e "${BLUE}[INFO]${NC} Chargement des modules..."
    
    # Module 1: Configuration interactive et validation
    if [[ -f "$SCRIPT_DIR/vps-setup-v3-interactive.sh" ]]; then
        source "$SCRIPT_DIR/vps-setup-v3-interactive.sh"
        echo -e "${GREEN}✓${NC} Module Interactive chargé"
    fi
    
    # Module 2: Fonctions sécurisées
    if [[ -f "$SCRIPT_DIR/vps-setup-v3-secure-functions.sh" ]]; then
        source "$SCRIPT_DIR/vps-setup-v3-secure-functions.sh"
        echo -e "${GREEN}✓${NC} Module Secure Functions chargé"
    fi
    
    # Module 3: Cloudflare & Docker
    if [[ -f "$SCRIPT_DIR/vps-setup-v3-cloudflare-docker.sh" ]]; then
        source "$SCRIPT_DIR/vps-setup-v3-cloudflare-docker.sh"
        echo -e "${GREEN}✓${NC} Module Cloudflare/Docker chargé"
    fi
    
    # Module 4: Monitoring & Tests
    if [[ -f "$SCRIPT_DIR/vps-setup-v3-monitoring-tests.sh" ]]; then
        source "$SCRIPT_DIR/vps-setup-v3-monitoring-tests.sh"
        echo -e "${GREEN}✓${NC} Module Monitoring/Tests chargé"
    fi
    
    # Module 5: Backup & Restore
    if [[ -f "$SCRIPT_DIR/vps-setup-v3-backup-restore.sh" ]]; then
        source "$SCRIPT_DIR/vps-setup-v3-backup-restore.sh"
        echo -e "${GREEN}✓${NC} Module Backup/Restore chargé"
    fi
    
    # Module 6: Fonctionnalités manquantes de v2
    if [[ -f "$SCRIPT_DIR/vps-setup-v3-missing-features.sh" ]]; then
        source "$SCRIPT_DIR/vps-setup-v3-missing-features.sh"
        echo -e "${GREEN}✓${NC} Module Missing Features chargé"
    fi
}

# Menu principal
show_menu() {
    echo -e "${BOLD}Que souhaitez-vous installer ?${NC}"
    echo ""
    echo "1) Installation complète (recommandé)"
    echo "2) Installation personnalisée"
    echo "3) Mode Docker uniquement"
    echo "4) Mode Kubernetes (K3s)"
    echo "5) Monitoring uniquement"
    echo "6) Backup système uniquement"
    echo "7) Tests système"
    echo "8) Quitter"
    echo ""
    read -p "Votre choix [1-8]: " choice
    
    case $choice in
        1) full_installation ;;
        2) custom_installation ;;
        3) docker_only ;;
        4) kubernetes_only ;;
        5) monitoring_only ;;
        6) backup_only ;;
        7) run_tests_only ;;
        8) exit 0 ;;
        *) echo "Choix invalide"; show_menu ;;
    esac
}

# Installation complète
full_installation() {
    echo -e "${GREEN}[START]${NC} Installation complète GMAH Platform..."
    
    # 1. Configuration interactive
    interactive_setup
    
    # 2. Système de base
    setup_system
    setup_user_and_ssh
    setup_firewall
    setup_fail2ban
    
    # 3. Services principaux
    setup_nodejs_nginx
    install_postgresql_secure
    install_redis_secure
    configure_nginx_secure
    
    # 4. Docker & Containers
    install_docker
    create_docker_compose
    
    # 5. Cloudflare Tunnel (optionnel)
    read -p "Configurer Cloudflare Tunnel ? (y/n) [n]: " use_tunnel
    if [[ "$use_tunnel" == "y" ]]; then
        setup_cloudflare_tunnel
    fi
    
    # 6. Kubernetes (optionnel)
    read -p "Installer Kubernetes (K3s) ? (y/n) [n]: " use_k8s
    if [[ "$use_k8s" == "y" ]]; then
        install_k3s
    fi
    
    # 7. Monitoring
    setup_advanced_monitoring
    setup_telegraf
    
    # 8. Backup
    setup_advanced_backup
    
    # 9. Sécurité avancée
    setup_postfix_mail
    setup_lynis_audit
    setup_aide_schedule
    setup_apparmor_profiles
    
    # 10. PM2 et Workers
    setup_pm2_startup
    setup_pm2_workers
    
    # 11. Tests finaux
    run_automated_tests
    
    echo -e "${GREEN}[SUCCESS]${NC} Installation complète terminée !"
}

# Installation personnalisée
custom_installation() {
    echo -e "${BOLD}Sélectionnez les composants à installer :${NC}"
    
    local components=()
    
    read -p "PostgreSQL ? (y/n) [y]: " install_pg
    [[ "${install_pg:-y}" == "y" ]] && components+=("postgresql")
    
    read -p "Redis ? (y/n) [y]: " install_redis
    [[ "${install_redis:-y}" == "y" ]] && components+=("redis")
    
    read -p "Nginx ? (y/n) [y]: " install_nginx
    [[ "${install_nginx:-y}" == "y" ]] && components+=("nginx")
    
    read -p "Docker ? (y/n) [y]: " install_docker
    [[ "${install_docker:-y}" == "y" ]] && components+=("docker")
    
    read -p "Monitoring (ELK + Prometheus) ? (y/n) [y]: " install_monitoring
    [[ "${install_monitoring:-y}" == "y" ]] && components+=("monitoring")
    
    read -p "Backup automatique ? (y/n) [y]: " install_backup
    [[ "${install_backup:-y}" == "y" ]] && components+=("backup")
    
    # Installation des composants sélectionnés
    for component in "${components[@]}"; do
        case $component in
            postgresql) install_postgresql_secure ;;
            redis) install_redis_secure ;;
            nginx) configure_nginx_secure ;;
            docker) install_docker && create_docker_compose ;;
            monitoring) setup_advanced_monitoring ;;
            backup) setup_advanced_backup ;;
        esac
    done
    
    echo -e "${GREEN}[SUCCESS]${NC} Installation personnalisée terminée !"
}

# Mode Docker uniquement
docker_only() {
    echo -e "${GREEN}[START]${NC} Installation Docker..."
    install_docker
    create_docker_compose
    
    read -p "Installer Portainer ? (y/n) [y]: " install_portainer
    [[ "${install_portainer:-y}" == "y" ]] && install_portainer_ce
    
    echo -e "${GREEN}[SUCCESS]${NC} Docker installé !"
}

# Mode Kubernetes uniquement
kubernetes_only() {
    echo -e "${GREEN}[START]${NC} Installation Kubernetes (K3s)..."
    install_k3s
    create_k8s_manifests
    echo -e "${GREEN}[SUCCESS]${NC} Kubernetes installé !"
}

# Monitoring uniquement
monitoring_only() {
    echo -e "${GREEN}[START]${NC} Installation Monitoring..."
    setup_advanced_monitoring
    echo -e "${GREEN}[SUCCESS]${NC} Monitoring installé !"
}

# Backup uniquement
backup_only() {
    echo -e "${GREEN}[START]${NC} Configuration Backup..."
    setup_advanced_backup
    echo -e "${GREEN}[SUCCESS]${NC} Backup configuré !"
}

# Tests uniquement
run_tests_only() {
    echo -e "${GREEN}[START]${NC} Exécution des tests..."
    run_automated_tests
    echo -e "${GREEN}[SUCCESS]${NC} Tests terminés !"
}

# Mode Quick Install (non-interactif)
quick_install() {
    echo -e "${GREEN}[QUICK]${NC} Installation rapide avec configuration par défaut..."
    
    # Charger config par défaut
    cat > /tmp/gmah-quick.conf << EOF
DOMAIN='gmah.local'
ADMIN_EMAIL='admin@gmah.local'
SYSTEM_USER='gmah'
SSH_PORT='2242'
DB_PASSWORD='$(openssl rand -base64 24)'
REDIS_PASSWORD='$(openssl rand -base64 24)'
JWT_SECRET='$(openssl rand -base64 48)'
USE_DOCKER='true'
USE_MONITORING='true'
USE_BACKUP='true'
EOF
    
    source /tmp/gmah-quick.conf
    
    # Installation sans interaction
    setup_system
    install_postgresql_secure
    install_redis_secure
    configure_nginx_secure
    install_docker
    setup_advanced_monitoring
    setup_advanced_backup
    
    echo -e "${GREEN}[SUCCESS]${NC} Installation rapide terminée !"
}

# Point d'entrée principal
main() {
    show_banner
    
    # Vérification root
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}[ERROR]${NC} Ce script doit être exécuté en tant que root"
        exit 1
    fi
    
    # Parsing des arguments
    case "${1:-}" in
        --quick)
            load_modules
            quick_install
            ;;
        --docker)
            load_modules
            docker_only
            ;;
        --k8s|--kubernetes)
            load_modules
            kubernetes_only
            ;;
        --test)
            load_modules
            run_tests_only
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick         Installation rapide avec config par défaut"
            echo "  --docker        Installer Docker uniquement"
            echo "  --k8s           Installer Kubernetes uniquement"
            echo "  --test          Exécuter les tests uniquement"
            echo "  --help          Afficher cette aide"
            echo ""
            echo "Sans option: Mode interactif avec menu"
            exit 0
            ;;
        *)
            load_modules
            show_menu
            ;;
    esac
}

# Lancement
main "$@"