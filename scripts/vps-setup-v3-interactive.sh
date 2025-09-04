#!/bin/bash

# ================================================================================
# GMAH PLATFORM - VPS ULTIMATE SETUP SCRIPT V3
# ================================================================================
# Description: Script interactif d'installation avec rollback et validation
# Author: GMAH DevOps Team
# Version: 3.0.0
# Date: 2025
# ================================================================================

set -euo pipefail
IFS=$'\n\t'

# ================================================================================
# VARIABLES GLOBALES
# ================================================================================

SCRIPT_VERSION="3.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/gmah-setup.log"
ROLLBACK_DIR="/root/.gmah-rollback"
CONFIG_FILE="/root/.gmah-setup.conf"
DRY_RUN=false
INTERACTIVE=true
AUTO_YES=false

# ================================================================================
# COULEURS ET FORMATAGE
# ================================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ================================================================================
# FONCTIONS UTILITAIRES AVANCÉES
# ================================================================================

# Logging amélioré
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message" >&2
            echo "[$timestamp] ERROR: $message" >> "$LOG_FILE"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            echo "[$timestamp] WARNING: $message" >> "$LOG_FILE"
            ;;
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            echo "[$timestamp] INFO: $message" >> "$LOG_FILE"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            echo "[$timestamp] SUCCESS: $message" >> "$LOG_FILE"
            ;;
        DEBUG)
            [[ "${DEBUG:-false}" == "true" ]] && echo -e "${PURPLE}[DEBUG]${NC} $message"
            echo "[$timestamp] DEBUG: $message" >> "$LOG_FILE"
            ;;
        *)
            echo -e "$message"
            echo "[$timestamp] $message" >> "$LOG_FILE"
            ;;
    esac
}

# Vérification prérequis système
check_prerequisites() {
    log INFO "Vérification des prérequis système..."
    
    # Vérification OS
    if [[ ! -f /etc/os-release ]]; then
        log ERROR "Impossible de détecter l'OS"
        return 1
    fi
    
    source /etc/os-release
    
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        log ERROR "OS non supporté: $ID. Ubuntu ou Debian requis."
        return 1
    fi
    
    if [[ "$VERSION_ID" != "22.04" && "$VERSION_ID" != "20.04" && "$VERSION_ID" != "11" ]]; then
        log WARNING "Version OS non testée: $VERSION_ID"
        read -p "Continuer quand même? (y/n) " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && return 1
    fi
    
    # Vérification root
    if [[ $EUID -ne 0 ]]; then
        log ERROR "Ce script doit être exécuté en tant que root"
        return 1
    fi
    
    # Vérification espace disque
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5000000 ]]; then  # 5GB minimum
        log ERROR "Espace disque insuffisant: $(($available_space/1024/1024))GB disponible, 5GB minimum requis"
        return 1
    fi
    
    # Vérification RAM
    local total_ram=$(free -m | awk 'NR==2 {print $2}')
    if [[ $total_ram -lt 2000 ]]; then  # 2GB minimum
        log WARNING "RAM faible: ${total_ram}MB. 4GB+ recommandé pour production"
    fi
    
    # Vérification connexion internet
    if ! ping -c 1 -W 2 8.8.8.8 &>/dev/null; then
        log ERROR "Pas de connexion internet"
        return 1
    fi
    
    log SUCCESS "Prérequis système validés"
    return 0
}

# Validation des entrées utilisateur
validate_input() {
    local input_type=$1
    local input_value=$2
    
    case $input_type in
        domain)
            if [[ ! "$input_value" =~ ^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; then
                log ERROR "Domaine invalide: $input_value"
                return 1
            fi
            ;;
        email)
            if [[ ! "$input_value" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                log ERROR "Email invalide: $input_value"
                return 1
            fi
            ;;
        port)
            if [[ ! "$input_value" =~ ^[0-9]+$ ]] || [[ $input_value -lt 1 || $input_value -gt 65535 ]]; then
                log ERROR "Port invalide: $input_value (doit être entre 1-65535)"
                return 1
            fi
            ;;
        username)
            if [[ ! "$input_value" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
                log ERROR "Nom d'utilisateur invalide: $input_value"
                return 1
            fi
            ;;
        password)
            if [[ ${#input_value} -lt 12 ]]; then
                log ERROR "Mot de passe trop court (minimum 12 caractères)"
                return 1
            fi
            ;;
        *)
            log WARNING "Type de validation inconnu: $input_type"
            ;;
    esac
    
    return 0
}

# Génération de mot de passe sécurisé
generate_secure_password() {
    local length=${1:-24}
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-${length}
}

# Sauvegarde pour rollback
create_backup() {
    local backup_item=$1
    local backup_path="$ROLLBACK_DIR/$(date +%Y%m%d_%H%M%S)_${backup_item}"
    
    log DEBUG "Création backup: $backup_item -> $backup_path"
    
    mkdir -p "$ROLLBACK_DIR"
    
    case $backup_item in
        sshd_config)
            [[ -f /etc/ssh/sshd_config ]] && cp -p /etc/ssh/sshd_config "$backup_path"
            ;;
        nginx)
            [[ -d /etc/nginx ]] && tar -czf "${backup_path}.tar.gz" /etc/nginx 2>/dev/null
            ;;
        postgresql)
            [[ -d /etc/postgresql ]] && tar -czf "${backup_path}.tar.gz" /etc/postgresql 2>/dev/null
            ;;
        *)
            [[ -e "$backup_item" ]] && cp -rp "$backup_item" "$backup_path"
            ;;
    esac
    
    echo "$backup_path" >> "$ROLLBACK_DIR/backup.list"
}

# Fonction de rollback
rollback() {
    log WARNING "Rollback en cours..."
    
    if [[ ! -f "$ROLLBACK_DIR/backup.list" ]]; then
        log ERROR "Aucun backup trouvé pour rollback"
        return 1
    fi
    
    while read -r backup_path; do
        if [[ -f "$backup_path" ]]; then
            local original_path=$(echo "$backup_path" | sed 's/.*_//')
            log INFO "Restauration: $original_path"
            cp -p "$backup_path" "$original_path"
        elif [[ -f "${backup_path}.tar.gz" ]]; then
            log INFO "Restauration archive: ${backup_path}.tar.gz"
            tar -xzf "${backup_path}.tar.gz" -C / 2>/dev/null
        fi
    done < "$ROLLBACK_DIR/backup.list"
    
    log SUCCESS "Rollback terminé"
}

# ================================================================================
# MODE INTERACTIF - COLLECTE DES CONFIGURATIONS
# ================================================================================

interactive_setup() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                    GMAH PLATFORM - CONFIGURATION INTERACTIVE                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log INFO "Mode interactif activé. Répondez aux questions pour configurer votre serveur."
    
    # Création du fichier de configuration
    echo "# GMAH Platform Setup Configuration" > "$CONFIG_FILE"
    echo "# Generated: $(date)" >> "$CONFIG_FILE"
    echo "" >> "$CONFIG_FILE"
    
    # 1. CONFIGURATION DOMAINE
    echo -e "\n${BOLD}1. Configuration du domaine${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local domain
    while true; do
        read -p "Nom de domaine principal (ex: gmah.com): " domain
        if validate_input domain "$domain"; then
            echo "DOMAIN='$domain'" >> "$CONFIG_FILE"
            break
        fi
    done
    
    local use_subdomains
    read -p "Utiliser des sous-domaines pour les organisations? (y/n) [y]: " use_subdomains
    use_subdomains=${use_subdomains:-y}
    echo "USE_SUBDOMAINS='$use_subdomains'" >> "$CONFIG_FILE"
    
    # 2. CONFIGURATION ADMIN
    echo -e "\n${BOLD}2. Configuration administrateur${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local admin_email
    while true; do
        read -p "Email administrateur: " admin_email
        if validate_input email "$admin_email"; then
            echo "ADMIN_EMAIL='$admin_email'" >> "$CONFIG_FILE"
            break
        fi
    done
    
    local admin_username
    while true; do
        read -p "Nom d'utilisateur système [gmah]: " admin_username
        admin_username=${admin_username:-gmah}
        if validate_input username "$admin_username"; then
            echo "SYSTEM_USER='$admin_username'" >> "$CONFIG_FILE"
            break
        fi
    done
    
    # 3. CONFIGURATION SÉCURITÉ
    echo -e "\n${BOLD}3. Configuration sécurité${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local ssh_port
    while true; do
        read -p "Port SSH [2242]: " ssh_port
        ssh_port=${ssh_port:-2242}
        if validate_input port "$ssh_port"; then
            echo "SSH_PORT='$ssh_port'" >> "$CONFIG_FILE"
            break
        fi
    done
    
    read -p "Activer l'authentification 2FA? (y/n) [y]: " enable_2fa
    enable_2fa=${enable_2fa:-y}
    echo "ENABLE_2FA='$enable_2fa'" >> "$CONFIG_FILE"
    
    # 4. BASE DE DONNÉES
    echo -e "\n${BOLD}4. Configuration base de données${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local db_password
    read -p "Générer automatiquement les mots de passe DB? (y/n) [y]: " auto_passwords
    auto_passwords=${auto_passwords:-y}
    
    if [[ "$auto_passwords" == "y" ]]; then
        db_password=$(generate_secure_password 24)
        log SUCCESS "Mot de passe DB généré automatiquement"
    else
        while true; do
            read -s -p "Mot de passe PostgreSQL: " db_password
            echo
            if validate_input password "$db_password"; then
                break
            fi
        done
    fi
    echo "DB_PASSWORD='$db_password'" >> "$CONFIG_FILE"
    
    # 5. STOCKAGE CLOUD
    echo -e "\n${BOLD}5. Configuration stockage cloud${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "Utiliser Cloudflare R2 pour le stockage? (y/n) [y]: " use_r2
    use_r2=${use_r2:-y}
    
    if [[ "$use_r2" == "y" ]]; then
        read -p "Account ID Cloudflare R2: " r2_account_id
        echo "R2_ACCOUNT_ID='$r2_account_id'" >> "$CONFIG_FILE"
        
        read -p "Access Key ID: " r2_access_key
        echo "R2_ACCESS_KEY_ID='$r2_access_key'" >> "$CONFIG_FILE"
        
        read -s -p "Secret Access Key: " r2_secret_key
        echo
        echo "R2_SECRET_ACCESS_KEY='$r2_secret_key'" >> "$CONFIG_FILE"
        
        read -p "Nom du bucket [gmah-storage]: " r2_bucket
        r2_bucket=${r2_bucket:-gmah-storage}
        echo "R2_BUCKET_NAME='$r2_bucket'" >> "$CONFIG_FILE"
    else
        echo "USE_R2='false'" >> "$CONFIG_FILE"
    fi
    
    # 6. MONITORING
    echo -e "\n${BOLD}6. Configuration monitoring${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "Configurer les alertes Telegram? (y/n) [n]: " use_telegram
    use_telegram=${use_telegram:-n}
    
    if [[ "$use_telegram" == "y" ]]; then
        read -p "Token du bot Telegram: " telegram_token
        echo "TELEGRAM_BOT_TOKEN='$telegram_token'" >> "$CONFIG_FILE"
        
        read -p "Chat ID Telegram: " telegram_chat_id
        echo "TELEGRAM_CHAT_ID='$telegram_chat_id'" >> "$CONFIG_FILE"
    fi
    
    read -p "Installer Netdata pour monitoring temps réel? (y/n) [y]: " install_netdata
    install_netdata=${install_netdata:-y}
    echo "INSTALL_NETDATA='$install_netdata'" >> "$CONFIG_FILE"
    
    # 7. OPTIONS AVANCÉES
    echo -e "\n${BOLD}7. Options avancées${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━"
    
    read -p "Utiliser Cloudflare Tunnel (plus sécurisé)? (y/n) [n]: " use_cf_tunnel
    use_cf_tunnel=${use_cf_tunnel:-n}
    echo "USE_CF_TUNNEL='$use_cf_tunnel'" >> "$CONFIG_FILE"
    
    read -p "Installer Docker? (y/n) [n]: " install_docker
    install_docker=${install_docker:-n}
    echo "INSTALL_DOCKER='$install_docker'" >> "$CONFIG_FILE"
    
    read -p "Mode de déploiement (dev/staging/production) [production]: " deploy_mode
    deploy_mode=${deploy_mode:-production}
    echo "DEPLOY_MODE='$deploy_mode'" >> "$CONFIG_FILE"
    
    # 8. CONFIRMATION
    echo -e "\n${BOLD}Configuration terminée!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "\nRésumé de la configuration:"
    echo -e "${CYAN}"
    cat "$CONFIG_FILE" | grep -v "PASSWORD\|SECRET\|KEY" | sed 's/^/  /'
    echo -e "${NC}"
    
    read -p "Confirmer et démarrer l'installation? (y/n): " confirm
    
    if [[ "$confirm" != "y" ]]; then
        log WARNING "Installation annulée par l'utilisateur"
        exit 0
    fi
    
    log SUCCESS "Configuration sauvegardée dans $CONFIG_FILE"
    
    # Charger la configuration
    source "$CONFIG_FILE"
}

# ================================================================================
# FONCTION DE TEST DES SERVICES
# ================================================================================

test_service() {
    local service_name=$1
    local test_command=$2
    local expected_result=$3
    
    log INFO "Test du service: $service_name"
    
    if eval "$test_command"; then
        log SUCCESS "$service_name: OK"
        return 0
    else
        log ERROR "$service_name: ÉCHEC"
        return 1
    fi
}

# ================================================================================
# MAIN - POINT D'ENTRÉE
# ================================================================================

main() {
    # Banner
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║   _____ __  __          _    _   _____  _       _    __                      ║
║  / ____|  \/  |   /\   | |  | | |  __ \| |     | |  / _|                    ║
║ | |  __| \  / |  /  \  | |__| | | |__) | | __ _| |_| |_ ___  _ __ _ __ ___  ║
║ | | |_ | |\/| | / /\ \ |  __  | |  ___/| |/ _` | __|  _/ _ \| '__| '_ ` _ \ ║
║ | |__| | |  | |/ ____ \| |  | | | |    | | (_| | |_| || (_) | |  | | | | | |║
║  \_____|_|  |_/_/    \_\_|  |_| |_|    |_|\__,_|\__|_| \___/|_|  |_| |_| |_|║
║                                                                              ║
║                     ULTIMATE VPS SETUP SCRIPT v3.0                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    # Parsing des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                CONFIG_FILE="$2"
                INTERACTIVE=false
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --yes|-y)
                AUTO_YES=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log ERROR "Option inconnue: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Initialisation du log
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log INFO "Démarrage du script GMAH Setup v$SCRIPT_VERSION"
    
    # Vérification des prérequis
    if ! check_prerequisites; then
        log ERROR "Prérequis non satisfaits. Abandon."
        exit 1
    fi
    
    # Mode interactif ou chargement de config
    if [[ "$INTERACTIVE" == "true" ]]; then
        interactive_setup
    elif [[ -f "$CONFIG_FILE" ]]; then
        log INFO "Chargement de la configuration depuis $CONFIG_FILE"
        source "$CONFIG_FILE"
    else
        log ERROR "Fichier de configuration non trouvé: $CONFIG_FILE"
        exit 1
    fi
    
    # TODO: Continuer avec l'installation...
    log INFO "Suite de l'installation à implémenter..."
}

# Affichage de l'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --config FILE    Utiliser un fichier de configuration existant
    --dry-run        Mode simulation (ne fait aucun changement)
    --yes, -y        Répondre oui à toutes les questions
    --help, -h       Afficher cette aide

Exemples:
    $0                          # Mode interactif
    $0 --config setup.conf      # Utiliser une configuration sauvegardée
    $0 --dry-run               # Tester sans modifier le système

EOF
}

# Trap pour cleanup en cas d'erreur
trap 'log ERROR "Erreur détectée. Rollback..."; rollback; exit 1' ERR

# Lancement du script
main "$@"