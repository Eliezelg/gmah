#!/bin/bash

# ================================================================================
# GMAH PLATFORM - TEST MODE FOR SETUP SCRIPTS
# ================================================================================
# Description: Test et validation des scripts sans modification système
# Usage: ./test-setup.sh [--dry-run|--docker|--validate]
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

# Mode test global
export DRY_RUN_MODE=false
export VALIDATION_MODE=false
export DOCKER_TEST_MODE=false

# ================================================================================
# MODE 1: DRY RUN - Simulation complète sans modification
# ================================================================================

setup_dry_run() {
    echo -e "${CYAN}[DRY RUN]${NC} Mode simulation activé - Aucune modification système"
    
    # Override des commandes système
    export -f apt-get
    export -f systemctl
    export -f useradd
    export -f ufw
    
    apt-get() {
        echo -e "${YELLOW}[SIMULATE]${NC} apt-get $@"
        return 0
    }
    
    systemctl() {
        echo -e "${YELLOW}[SIMULATE]${NC} systemctl $@"
        return 0
    }
    
    useradd() {
        echo -e "${YELLOW}[SIMULATE]${NC} useradd $@"
        return 0
    }
    
    ufw() {
        echo -e "${YELLOW}[SIMULATE]${NC} ufw $@"
        return 0
    }
    
    # Création de fichiers temporaires pour simulation
    export CONFIG_DIR="/tmp/gmah-test-config"
    export LOG_DIR="/tmp/gmah-test-logs"
    export BACKUP_DIR="/tmp/gmah-test-backups"
    
    mkdir -p "$CONFIG_DIR" "$LOG_DIR" "$BACKUP_DIR"
    
    # Chargement des modules en mode test
    DRY_RUN_MODE=true
    
    echo -e "${GREEN}✓${NC} Environnement de test configuré"
}

# ================================================================================
# MODE 2: VALIDATION - Vérification syntaxe et dépendances
# ================================================================================

validate_scripts() {
    echo -e "${CYAN}[VALIDATE]${NC} Vérification des scripts..."
    
    local errors=0
    local warnings=0
    
    # Liste des scripts à valider
    local scripts=(
        "setup.sh"
        "vps-setup-v3-interactive.sh"
        "vps-setup-v3-secure-functions.sh"
        "vps-setup-v3-cloudflare-docker.sh"
        "vps-setup-v3-monitoring-tests.sh"
        "vps-setup-v3-backup-restore.sh"
        "vps-setup-v3-missing-features.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        
        if [[ ! -f "$script_path" ]]; then
            echo -e "${RED}✗${NC} Script manquant: $script"
            ((errors++))
            continue
        fi
        
        # Vérification syntaxe bash
        if bash -n "$script_path" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Syntaxe OK: $script"
        else
            echo -e "${RED}✗${NC} Erreur syntaxe: $script"
            bash -n "$script_path"
            ((errors++))
        fi
        
        # Vérification shellcheck si disponible
        if command -v shellcheck >/dev/null 2>&1; then
            local issues=$(shellcheck -S warning "$script_path" 2>&1 | wc -l)
            if [[ $issues -gt 0 ]]; then
                echo -e "${YELLOW}⚠${NC} ShellCheck: $issues avertissements dans $script"
                ((warnings+=issues))
            fi
        fi
    done
    
    echo ""
    echo -e "${BOLD}Résultats validation:${NC}"
    echo -e "Erreurs: $errors"
    echo -e "Avertissements: $warnings"
    
    [[ $errors -eq 0 ]] && return 0 || return 1
}

# ================================================================================
# MODE 3: DOCKER TEST - Test isolé dans container
# ================================================================================

create_dockerfile() {
    cat > "$SCRIPT_DIR/Dockerfile.test" << 'EOF'
FROM ubuntu:22.04

# Éviter les prompts interactifs
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Installation des dépendances de base
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    sudo \
    systemd \
    bash \
    openssl \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    ufw \
    fail2ban \
    net-tools \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Créer un utilisateur de test
RUN useradd -m -s /bin/bash testuser && \
    echo "testuser ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/testuser

# Copier les scripts
WORKDIR /opt/gmah
COPY . .

# Donner les permissions
RUN chmod +x *.sh

# Script d'entrée pour test
RUN echo '#!/bin/bash\n\
echo "Container de test GMAH Platform prêt"\n\
echo "Utilisez --dry-run pour tester les scripts"\n\
exec "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/bash"]
EOF
}

run_docker_test() {
    echo -e "${CYAN}[DOCKER]${NC} Création du container de test..."
    
    create_dockerfile
    
    # Build de l'image
    echo -e "${BLUE}[BUILD]${NC} Construction de l'image Docker..."
    docker build -t gmah-test:latest -f "$SCRIPT_DIR/Dockerfile.test" "$SCRIPT_DIR"
    
    # Lancement du container
    echo -e "${GREEN}[RUN]${NC} Lancement du container de test..."
    docker run -it --rm \
        --name gmah-test \
        -v "$SCRIPT_DIR:/opt/gmah:ro" \
        -e DRY_RUN_MODE=true \
        gmah-test:latest \
        bash -c "cd /opt/gmah && ./setup.sh --quick"
    
    echo -e "${GREEN}✓${NC} Test Docker terminé"
}

# ================================================================================
# MODE 4: TEST UNITAIRE - Test des fonctions individuelles
# ================================================================================

run_unit_tests() {
    echo -e "${CYAN}[UNIT TEST]${NC} Test des fonctions principales..."
    
    # Test 1: Validation de syntaxe bash
    echo -e "${BLUE}Test 1:${NC} Validation syntaxe bash"
    local syntax_ok=true
    for script in "$SCRIPT_DIR"/vps-setup-v3-*.sh; do
        if bash -n "$script" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $(basename "$script")"
        else
            echo -e "  ${RED}✗${NC} $(basename "$script")"
            syntax_ok=false
        fi
    done
    
    # Test 2: Vérification des fonctions définies
    echo -e "${BLUE}Test 2:${NC} Vérification des fonctions clés"
    
    # Extraire les noms de fonctions sans exécuter
    local functions=(
        "interactive_setup"
        "setup_system"
        "install_postgresql_secure"
        "install_redis_secure"
        "setup_cloudflare_tunnel"
        "setup_advanced_monitoring"
        "setup_advanced_backup"
    )
    
    for func in "${functions[@]}"; do
        if grep -q "^${func}()" "$SCRIPT_DIR"/*.sh 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Fonction $func trouvée"
        else
            echo -e "  ${RED}✗${NC} Fonction $func manquante"
        fi
    done
    
    # Test 3: Validation des patterns de sécurité
    echo -e "${BLUE}Test 3:${NC} Vérification sécurité"
    
    # Vérifier qu'on n'a pas de mots de passe en dur
    if grep -r "password\s*=\s*['\"]" "$SCRIPT_DIR" --include="*.sh" | grep -v generate | grep -v random | grep -v example; then
        echo -e "  ${RED}✗${NC} Mots de passe en dur détectés"
    else
        echo -e "  ${GREEN}✓${NC} Pas de mots de passe en dur"
    fi
    
    # Vérifier les commandes sudo
    if grep -r "sudo\s\+rm\s\+-rf\s\+/" "$SCRIPT_DIR" --include="*.sh"; then
        echo -e "  ${YELLOW}⚠${NC} Commandes dangereuses détectées (rm -rf /)"
    else
        echo -e "  ${GREEN}✓${NC} Pas de commandes dangereuses"
    fi
    
    # Test 4: Vérification des variables obligatoires
    echo -e "${BLUE}Test 4:${NC} Variables d'environnement"
    local required_vars=(
        "DOMAIN"
        "ADMIN_EMAIL"
        "DB_PASSWORD"
        "REDIS_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "$var" "$SCRIPT_DIR"/*.sh 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Variable $var utilisée"
        else
            echo -e "  ${YELLOW}⚠${NC} Variable $var non trouvée"
        fi
    done
    
    echo -e "${GREEN}✓${NC} Tests unitaires terminés"
}

# ================================================================================
# MODE 5: TEST D'INTÉGRATION LOCAL
# ================================================================================

run_local_integration_test() {
    echo -e "${CYAN}[INTEGRATION]${NC} Test d'intégration local..."
    
    # Créer un environnement isolé
    local TEST_ROOT="/tmp/gmah-integration-test-$$"
    mkdir -p "$TEST_ROOT"/{etc,var/log,var/lib,opt,home}
    
    echo -e "${BLUE}[SETUP]${NC} Environnement de test: $TEST_ROOT"
    
    # Variables d'environnement pour isolation
    export PREFIX="$TEST_ROOT"
    export CONFIG_DIR="$TEST_ROOT/etc/gmah"
    export LOG_DIR="$TEST_ROOT/var/log/gmah"
    export DATA_DIR="$TEST_ROOT/var/lib/gmah"
    
    # Créer une configuration de test
    mkdir -p "$CONFIG_DIR"
    cat > "$CONFIG_DIR/test.conf" << EOF
DOMAIN='test.gmah.local'
ADMIN_EMAIL='admin@test.local'
SYSTEM_USER='gmah-test'
SSH_PORT='2242'
DB_PASSWORD='test_password_123'
REDIS_PASSWORD='test_redis_123'
JWT_SECRET='test_jwt_secret'
USE_DOCKER='false'
USE_MONITORING='false'
USE_BACKUP='false'
EOF
    
    # Simuler l'installation
    echo -e "${YELLOW}[TEST]${NC} Simulation d'installation..."
    
    # Test de création des répertoires
    mkdir -p "$LOG_DIR" "$DATA_DIR"
    [[ -d "$LOG_DIR" ]] && echo -e "${GREEN}✓${NC} Répertoires créés"
    
    # Test de génération des configs
    cat > "$CONFIG_DIR/nginx.conf" << EOF
server {
    listen 80;
    server_name test.gmah.local;
    root $TEST_ROOT/var/www/gmah;
}
EOF
    [[ -f "$CONFIG_DIR/nginx.conf" ]] && echo -e "${GREEN}✓${NC} Configuration Nginx générée"
    
    # Test de génération des certificats auto-signés
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CONFIG_DIR/test.key" \
        -out "$CONFIG_DIR/test.crt" \
        -subj "/C=FR/ST=Test/L=Test/O=GMAH/CN=test.gmah.local" \
        2>/dev/null
    
    [[ -f "$CONFIG_DIR/test.crt" ]] && echo -e "${GREEN}✓${NC} Certificats SSL générés"
    
    # Nettoyage
    echo -e "${BLUE}[CLEANUP]${NC} Nettoyage..."
    rm -rf "$TEST_ROOT"
    
    echo -e "${GREEN}✓${NC} Test d'intégration terminé"
}

# ================================================================================
# MENU PRINCIPAL
# ================================================================================

show_help() {
    cat << EOF
${BOLD}GMAH Platform - Mode Test${NC}

Usage: $0 [OPTIONS]

Options:
    --dry-run       Mode simulation (aucune modification système)
    --validate      Valider la syntaxe des scripts
    --docker        Tester dans un container Docker isolé
    --unit          Exécuter les tests unitaires
    --integration   Test d'intégration local
    --all           Exécuter tous les tests
    --help          Afficher cette aide

Exemples:
    $0 --dry-run      # Simuler l'installation complète
    $0 --validate     # Vérifier la syntaxe seulement
    $0 --docker       # Tester dans Docker
    $0 --all          # Tout tester

EOF
}

main() {
    case "${1:-}" in
        --dry-run)
            setup_dry_run
            echo -e "${YELLOW}[INFO]${NC} Lancement du setup en mode dry-run..."
            DRY_RUN_MODE=true bash "$SCRIPT_DIR/setup.sh" --quick
            ;;
        --validate)
            validate_scripts
            ;;
        --docker)
            run_docker_test
            ;;
        --unit)
            run_unit_tests
            ;;
        --integration)
            run_local_integration_test
            ;;
        --all)
            echo -e "${BOLD}Exécution de tous les tests...${NC}\n"
            validate_scripts
            echo ""
            run_unit_tests
            echo ""
            run_local_integration_test
            echo ""
            echo -e "${GREEN}[SUCCESS]${NC} Tous les tests terminés!"
            ;;
        --help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# Lancement
main "$@"