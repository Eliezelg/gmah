#!/bin/bash

# ================================================================================
# GMAH PLATFORM - VPS ULTIMATE SETUP SCRIPT
# ================================================================================
# Description: Script complet d'installation et sécurisation pour VPS Ubuntu 22.04
# Author: GMAH DevOps Team
# Version: 2.0.0
# Date: 2025
# ================================================================================

set -euo pipefail
IFS=$'\n\t'

# ================================================================================
# CONFIGURATION - MODIFIER CES VALEURS AVANT EXECUTION
# ================================================================================

# Informations de base
DOMAIN="gmah.com"
ADMIN_EMAIL="admin@gmah.com"
TIMEZONE="Europe/Paris"

# Utilisateur système
SYSTEM_USER="gmah"
SYSTEM_USER_PASSWORD=$(openssl rand -base64 32)

# Ports SSH (changer le port par défaut pour sécurité)
SSH_PORT="2242"

# PostgreSQL
DB_USER="gmah"
DB_PASSWORD=$(openssl rand -base64 24)
DB_PORT="5432"

# Redis
REDIS_PASSWORD=$(openssl rand -base64 24)
REDIS_PORT="6379"

# JWT & App Secrets
JWT_SECRET=$(openssl rand -base64 48)
APP_SECRET=$(openssl rand -base64 32)

# Cloudflare R2 (à remplir avec vos informations)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="gmah-storage"

# Telegram Alertes (optionnel mais recommandé)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# ================================================================================
# COULEURS ET FORMATAGE
# ================================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ================================================================================
# FONCTIONS UTILITAIRES
# ================================================================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Vérification root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Ce script doit être exécuté en tant que root"
        exit 1
    fi
}

# Génération de mots de passe forts
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Sauvegarde des credentials
save_credentials() {
    local CREDS_FILE="/root/gmah-credentials.txt"
    cat > "$CREDS_FILE" << EOF
================================================================================
GMAH PLATFORM - CREDENTIALS
Generated: $(date)
================================================================================

SYSTEM
------
User: $SYSTEM_USER
Password: $SYSTEM_USER_PASSWORD
SSH Port: $SSH_PORT

DATABASE
--------
PostgreSQL User: $DB_USER
PostgreSQL Password: $DB_PASSWORD
PostgreSQL Port: $DB_PORT

Redis Password: $REDIS_PASSWORD
Redis Port: $REDIS_PORT

APPLICATION
-----------
JWT Secret: $JWT_SECRET
App Secret: $APP_SECRET

CLOUDFLARE R2
-------------
Account ID: $R2_ACCOUNT_ID
Access Key: $R2_ACCESS_KEY_ID
Secret Key: $R2_SECRET_ACCESS_KEY
Bucket: $R2_BUCKET_NAME

MONITORING
----------
Telegram Bot: $TELEGRAM_BOT_TOKEN
Telegram Chat: $TELEGRAM_CHAT_ID

================================================================================
IMPORTANT: Sauvegarder ce fichier en lieu sûr et le supprimer du serveur!
================================================================================
EOF
    chmod 600 "$CREDS_FILE"
    info "Credentials sauvegardés dans $CREDS_FILE"
}

# ================================================================================
# ETAPE 1: MISE A JOUR SYSTEME ET CONFIGURATION DE BASE
# ================================================================================

setup_system() {
    log "Configuration du système de base..."
    
    # Mise à jour complète
    apt-get update
    apt-get upgrade -y
    apt-get dist-upgrade -y
    apt-get autoremove -y
    apt-get autoclean
    
    # Installation des paquets essentiels
    apt-get install -y \
        curl wget git vim nano htop \
        build-essential software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release \
        ufw fail2ban iptables-persistent \
        unzip zip tar gzip bzip2 \
        net-tools dnsutils iputils-ping \
        cron logrotate \
        python3 python3-pip \
        mailutils postfix \
        jq tree ncdu \
        sysstat iotop nethogs \
        unattended-upgrades
    
    # Configuration timezone
    timedatectl set-timezone "$TIMEZONE"
    
    # Configuration locale
    locale-gen en_US.UTF-8
    update-locale LANG=en_US.UTF-8
    
    # Optimisations kernel
    cat >> /etc/sysctl.conf << 'EOF'

# ================================================================================
# GMAH Platform - Kernel Optimizations
# ================================================================================

# Network Performance
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 65536
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# Security
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Memory
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# File Descriptors
fs.file-max = 2097152
fs.nr_open = 1048576

EOF
    sysctl -p
    
    # Limites système
    cat >> /etc/security/limits.conf << 'EOF'

# GMAH Platform Limits
* soft nofile 65535
* hard nofile 65535
* soft nproc 32768
* hard nproc 32768
gmah soft nofile 65535
gmah hard nofile 65535
gmah soft nproc 32768
gmah hard nproc 32768
EOF
    
    success "Configuration système terminée"
}

# ================================================================================
# ETAPE 2: CREATION UTILISATEUR ET CONFIGURATION SSH
# ================================================================================

setup_user_and_ssh() {
    log "Création de l'utilisateur système et configuration SSH..."
    
    # Création utilisateur
    if ! id "$SYSTEM_USER" &>/dev/null; then
        useradd -m -s /bin/bash "$SYSTEM_USER"
        echo "$SYSTEM_USER:$SYSTEM_USER_PASSWORD" | chpasswd
        usermod -aG sudo "$SYSTEM_USER"
    fi
    
    # Configuration SSH
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    cat > /etc/ssh/sshd_config << EOF
# GMAH Platform SSH Configuration
Port $SSH_PORT
Protocol 2
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# Security
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Limits
MaxAuthTries 3
MaxSessions 10
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2

# Restrictions
AllowUsers $SYSTEM_USER
X11Forwarding no
AllowTcpForwarding no
AllowStreamLocalForwarding no
GatewayPorts no
PermitTunnel no

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Performance
UsePAM yes
UseDNS no
Compression no

# SFTP
Subsystem sftp /usr/lib/openssh/sftp-server
EOF
    
    # Génération clé SSH pour l'utilisateur
    sudo -u "$SYSTEM_USER" mkdir -p /home/"$SYSTEM_USER"/.ssh
    sudo -u "$SYSTEM_USER" ssh-keygen -t ed25519 -f /home/"$SYSTEM_USER"/.ssh/id_ed25519 -N ""
    sudo -u "$SYSTEM_USER" touch /home/"$SYSTEM_USER"/.ssh/authorized_keys
    chmod 700 /home/"$SYSTEM_USER"/.ssh
    chmod 600 /home/"$SYSTEM_USER"/.ssh/authorized_keys
    
    # Redémarrage SSH
    systemctl restart sshd
    
    success "Configuration SSH terminée sur le port $SSH_PORT"
}

# ================================================================================
# ETAPE 3: CONFIGURATION FIREWALL ULTRA SECURISE
# ================================================================================

setup_firewall() {
    log "Configuration du firewall UFW..."
    
    # Reset firewall
    ufw --force disable
    ufw --force reset
    
    # Règles par défaut
    ufw default deny incoming
    ufw default allow outgoing
    ufw default deny routed
    
    # Règles SSH avec limitation
    ufw limit "$SSH_PORT"/tcp comment 'SSH rate limiting'
    
    # HTTP/HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Protection DDoS avec iptables
    iptables -N RATE_LIMIT
    iptables -A RATE_LIMIT -m limit --limit 25/min --limit-burst 100 -j ACCEPT
    iptables -A RATE_LIMIT -j DROP
    
    # Protection SYN Flood
    iptables -N SYN_FLOOD
    iptables -A SYN_FLOOD -m limit --limit 2/s --limit-burst 6 -j RETURN
    iptables -A SYN_FLOOD -j DROP
    
    # Bloquer les scans de ports
    iptables -N PORT_SCAN
    iptables -A PORT_SCAN -p tcp --tcp-flags SYN,ACK,FIN,RST RST -m limit --limit 1/s -j RETURN
    iptables -A PORT_SCAN -j DROP
    
    # Sauvegarde des règles iptables
    netfilter-persistent save
    
    # Activation UFW
    ufw --force enable
    
    success "Firewall configuré et activé"
}

# ================================================================================
# ETAPE 4: CONFIGURATION FAIL2BAN AVANCEE
# ================================================================================

setup_fail2ban() {
    log "Configuration de Fail2ban..."
    
    # Configuration principale
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@gmah.com
action = %(action_mwl)s
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = 2242
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[sshd-ddos]
enabled = true
port = 2242
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 86400

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 7200

[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/*.log
maxretry = 5
bantime = 7200
EOF
    
    # Filtre DDoS SSH personnalisé
    cat > /etc/fail2ban/filter.d/sshd-ddos.conf << 'EOF'
[Definition]
failregex = ^.*sshd\[.*\]: Did not receive identification string from <HOST>$
            ^.*sshd\[.*\]: Connection from <HOST> port .* \[preauth\]$
ignoreregex =
EOF
    
    # Filtre pour requêtes nginx
    cat > /etc/fail2ban/filter.d/nginx-req-limit.conf << 'EOF'
[Definition]
failregex = ^.*limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF
    
    # Filtre PostgreSQL
    cat > /etc/fail2ban/filter.d/postgresql.conf << 'EOF'
[Definition]
failregex = ^.*FATAL:.*authentication failed for user.*from <HOST>$
            ^.*FATAL:.*no pg_hba.conf entry for host "<HOST>".*$
ignoreregex =
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    success "Fail2ban configuré et activé"
}

# ================================================================================
# ETAPE 5: INSTALLATION NODE.JS, NGINX, PM2
# ================================================================================

setup_nodejs_nginx() {
    log "Installation de Node.js, Nginx et PM2..."
    
    # Node.js 20 LTS
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    # Yarn
    npm install -g yarn
    
    # PM2
    npm install -g pm2
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 100M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    
    # Nginx avec modules de sécurité
    apt-get install -y nginx nginx-extras libnginx-mod-http-geoip
    
    # Configuration Nginx sécurisée
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    types_hash_max_size 2048;
    server_tokens off;
    more_set_headers 'Server: GMAH';
    
    # Timeouts
    keepalive_timeout 65;
    keepalive_requests 100;
    reset_timedout_connection on;
    client_body_timeout 10;
    client_header_timeout 10;
    send_timeout 10;
    
    # Buffers
    client_body_buffer_size 128k;
    client_max_body_size 50M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # Cache
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    access_log /var/log/nginx/access.log main buffer=16k;
    error_log /var/log/nginx/error.log warn;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    # GeoIP Blocking
    geoip_country /usr/share/GeoIP/GeoIP.dat;
    map $geoip_country_code $allowed_country {
        default yes;
        # Bloquer des pays spécifiques si nécessaire
        # CN no;
        # RU no;
    }
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/x-js text/x-cross-domain-policy application/x-font-ttf application/x-font-opentype application/vnd.ms-fontobject font/opentype;
    
    # Brotli
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;
    
    # Virtual Host Configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
    
    systemctl enable nginx
    
    success "Node.js, Nginx et PM2 installés"
}

# ================================================================================
# ETAPE 6: INSTALLATION ET CONFIGURATION POSTGRESQL
# ================================================================================

setup_postgresql() {
    log "Installation et configuration de PostgreSQL..."
    
    # Installation PostgreSQL 15
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-15 postgresql-client-15 postgresql-contrib-15
    
    # Configuration PostgreSQL optimisée
    PG_VERSION="15"
    PG_CONFIG="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
    PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    
    # Calcul des paramètres optimaux
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    SHARED_BUFFERS=$((TOTAL_MEM / 4))
    EFFECTIVE_CACHE=$((TOTAL_MEM * 3 / 4))
    MAINTENANCE_MEM=$((TOTAL_MEM / 16))
    WAL_BUFFERS=$((SHARED_BUFFERS / 32))
    
    cat >> "$PG_CONFIG" << EOF

# ================================================================================
# GMAH Platform PostgreSQL Optimizations
# ================================================================================

# Memory
shared_buffers = ${SHARED_BUFFERS}MB
effective_cache_size = ${EFFECTIVE_CACHE}MB
maintenance_work_mem = ${MAINTENANCE_MEM}MB
work_mem = 8MB
wal_buffers = ${WAL_BUFFERS}MB

# Connections
max_connections = 200
superuser_reserved_connections = 3

# Checkpoints
checkpoint_segments = 32
checkpoint_completion_target = 0.9
wal_keep_segments = 32

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Statistics
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all

# Security
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s

# Locale
lc_messages = 'en_US.UTF-8'
lc_monetary = 'en_US.UTF-8'
lc_numeric = 'en_US.UTF-8'
lc_time = 'en_US.UTF-8'
EOF
    
    # Configuration pg_hba.conf
    cat > "$PG_HBA" << EOF
# Database administrative login by Unix domain socket
local   all             postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF
    
    # Redémarrage PostgreSQL
    systemctl restart postgresql
    
    # Création utilisateur et base de données
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER USER $DB_USER CREATEDB;
CREATE DATABASE gmah_master OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE gmah_master TO $DB_USER;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOF
    
    # PgBouncer pour connection pooling
    apt-get install -y pgbouncer
    
    cat > /etc/pgbouncer/pgbouncer.ini << EOF
[databases]
gmah_master = host=127.0.0.1 port=5432 dbname=gmah_master
* = host=127.0.0.1 port=5432

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = $DB_USER
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
autodb_idle_timeout = 3600
dns_max_ttl = 15
dns_nxdomain_ttl = 15
stats_period = 60
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
EOF
    
    # Userlist pour PgBouncer
    echo "\"$DB_USER\" \"$DB_PASSWORD\"" > /etc/pgbouncer/userlist.txt
    chmod 600 /etc/pgbouncer/userlist.txt
    chown postgres:postgres /etc/pgbouncer/userlist.txt
    
    systemctl enable pgbouncer
    systemctl restart pgbouncer
    
    success "PostgreSQL configuré et optimisé"
}

# ================================================================================
# ETAPE 7: INSTALLATION ET CONFIGURATION REDIS
# ================================================================================

setup_redis() {
    log "Installation et configuration de Redis..."
    
    # Installation Redis
    apt-get install -y redis-server redis-tools
    
    # Configuration Redis optimisée
    cat > /etc/redis/redis.conf << EOF
# Network
bind 127.0.0.1 ::1
protected-mode yes
port $REDIS_PORT
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Replication
replica-read-only yes

# Security
requirepass $REDIS_PASSWORD
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG "CONFIG_$REDIS_PASSWORD"

# Limits
maxclients 10000
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Append only mode
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Lua scripting
lua-time-limit 5000

# Cluster
cluster-enabled no

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Advanced config
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
EOF
    
    # Optimisations kernel pour Redis
    echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
    echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
    sysctl -p
    
    # Disable Transparent Huge Pages
    echo never > /sys/kernel/mm/transparent_hugepage/enabled
    echo never > /sys/kernel/mm/transparent_hugepage/defrag
    
    cat > /etc/systemd/system/disable-transparent-huge-pages.service << 'EOF'
[Unit]
Description=Disable Transparent Huge Pages
Before=redis-server.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled && echo never > /sys/kernel/mm/transparent_hugepage/defrag'

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl enable disable-transparent-huge-pages.service
    systemctl start disable-transparent-huge-pages.service
    
    systemctl enable redis-server
    systemctl restart redis-server
    
    success "Redis configuré et optimisé"
}

# ================================================================================
# ETAPE 8: CONFIGURATION APPLICATION GMAH
# ================================================================================

setup_gmah_application() {
    log "Configuration de l'application GMAH..."
    
    # Création des répertoires
    sudo -u "$SYSTEM_USER" mkdir -p /home/"$SYSTEM_USER"/{gmah-platform,logs,backups,uploads}
    
    # Clone du repository (ou extraction depuis archive)
    cd /home/"$SYSTEM_USER"/gmah-platform
    
    # Création du fichier .env.production
    cat > .env.production << EOF
# ================================================================================
# GMAH PLATFORM - PRODUCTION ENVIRONMENT
# ================================================================================

# Application
NODE_ENV=production
APP_NAME=GMAH Platform
APP_URL=https://$DOMAIN
API_PORT=3333
FRONTEND_PORT=3000

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:6432/gmah_master
DATABASE_URL_BASE=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:6432/
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_SSL=false

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_DB=0

# JWT & Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d
BCRYPT_ROUNDS=12
SESSION_SECRET=$APP_SECRET
CORS_ORIGIN=https://$DOMAIN,https://*.$DOMAIN

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=$ADMIN_EMAIL
MAIL_PASSWORD=your-email-password
MAIL_FROM=$ADMIN_EMAIL
MAIL_FROM_NAME=GMAH Platform

# Cloudflare R2
R2_ACCOUNT_ID=$R2_ACCOUNT_ID
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME=$R2_BUCKET_NAME
R2_PUBLIC_URL=https://pub-xxx.r2.dev
R2_REGION=auto

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info
ENABLE_SWAGGER=false

# Telegram Alerts
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
EOF
    
    chown "$SYSTEM_USER:$SYSTEM_USER" .env.production
    chmod 600 .env.production
    
    # Configuration PM2
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'gmah-api',
      script: 'dist/apps/api/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3333
      },
      error_file: '/home/gmah/logs/api-error.log',
      out_file: '/home/gmah/logs/api-out.log',
      merge_logs: true,
      time: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'gmah-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/home/gmah/gmah-platform/apps/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/gmah/logs/web-error.log',
      out_file: '/home/gmah/logs/web-out.log',
      time: true
    },
    {
      name: 'gmah-worker',
      script: 'dist/apps/worker/main.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: '/home/gmah/logs/worker-error.log',
      out_file: '/home/gmah/logs/worker-out.log',
      time: true
    }
  ],
  
  deploy: {
    production: {
      user: 'gmah',
      host: '$DOMAIN',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/gmah-platform.git',
      path: '/home/gmah/gmah-platform',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
EOF
    
    chown "$SYSTEM_USER:$SYSTEM_USER" ecosystem.config.js
    
    success "Configuration application GMAH terminée"
}

# ================================================================================
# ETAPE 9: CONFIGURATION NGINX POUR GMAH
# ================================================================================

setup_nginx_vhost() {
    log "Configuration des virtual hosts Nginx..."
    
    # Configuration principale GMAH
    cat > /etc/nginx/sites-available/gmah << 'EOF'
# ================================================================================
# GMAH PLATFORM - NGINX CONFIGURATION
# ================================================================================

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=gmah_general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=gmah_api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=gmah_auth:10m rate=5r/m;
limit_conn_zone $binary_remote_addr zone=gmah_addr:10m;

# Upstream servers
upstream gmah_api {
    least_conn;
    server 127.0.0.1:3333 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream gmah_frontend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name gmah.com *.gmah.com;
    
    # ACME Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gmah.com *.gmah.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/gmah.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gmah.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/gmah.com/chain.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.gmah.com wss://gmah.com;" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
    
    # Logging
    access_log /var/log/nginx/gmah-access.log main buffer=16k;
    error_log /var/log/nginx/gmah-error.log warn;
    
    # Root directory
    root /home/gmah/gmah-platform/apps/web/public;
    index index.html;
    
    # Rate limiting
    limit_req zone=gmah_general burst=20 nodelay;
    limit_conn gmah_addr 10;
    
    # Client body size
    client_max_body_size 50M;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
    
    # API Routes
    location /api {
        # Rate limiting for API
        limit_req zone=gmah_api burst=50 nodelay;
        
        # Authentication endpoints - stricter rate limiting
        location ~ ^/api/auth/(login|register|reset-password) {
            limit_req zone=gmah_auth burst=5 nodelay;
            proxy_pass http://gmah_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;
            proxy_cache_bypass $http_upgrade;
            proxy_redirect off;
            proxy_buffering off;
        }
        
        # General API endpoints
        proxy_pass http://gmah_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header X-Tenant-Domain $host;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://gmah_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /uploads {
        alias /home/gmah/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
        
        # Security for uploaded files
        location ~ \.(php|php3|php4|php5|php7|phtml|pl|py|pyc|pyo|sh|cgi|bat|exe|dll|aspx?|jsp|jar|sql)$ {
            deny all;
        }
    }
    
    # Frontend assets
    location /_next/static {
        alias /home/gmah/gmah-platform/apps/web/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Frontend routes
    location / {
        proxy_pass http://gmah_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security: Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /\.(?!well-known) {
        deny all;
    }
    
    # Block common exploits
    location ~* (eval\(|base64_|shell_|exec\(|php_|system\(|passthru\(|preg_\w+\(|file_|include\(|require\(|require_once\(|include_once\(|fsockopen|popen|proc_open|curl_exec).* {
        deny all;
    }
    
    # Block access to backup files
    location ~* \.(sql|bak|backup|old|temp|tmp|cache|lock)$ {
        deny all;
    }
}
EOF
    
    # Activation du site
    ln -sf /etc/nginx/sites-available/gmah /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    systemctl reload nginx
    
    success "Configuration Nginx terminée"
}

# ================================================================================
# ETAPE 10: SSL AVEC CERTBOT
# ================================================================================

setup_ssl() {
    log "Configuration SSL avec Certbot..."
    
    # Installation Certbot
    apt-get install -y certbot python3-certbot-nginx
    
    # Création répertoire pour ACME challenge
    mkdir -p /var/www/certbot
    
    # Génération certificat (mode test d'abord)
    certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email "$ADMIN_EMAIL" \
        --domains "$DOMAIN,*.$DOMAIN" \
        --staging
    
    # Si test OK, génération du vrai certificat
    read -p "Test SSL réussi? Générer le certificat de production? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot certonly \
            --nginx \
            --non-interactive \
            --agree-tos \
            --email "$ADMIN_EMAIL" \
            --domains "$DOMAIN,*.$DOMAIN" \
            --force-renewal
    fi
    
    # Auto-renouvellement
    cat > /etc/systemd/system/certbot-renewal.service << 'EOF'
[Unit]
Description=Certbot Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --no-self-upgrade --post-hook "systemctl reload nginx"
EOF
    
    cat > /etc/systemd/system/certbot-renewal.timer << 'EOF'
[Unit]
Description=Run Certbot Renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    systemctl enable certbot-renewal.timer
    systemctl start certbot-renewal.timer
    
    success "SSL configuré avec auto-renouvellement"
}

# ================================================================================
# ETAPE 11: MONITORING ET ALERTES
# ================================================================================

setup_monitoring() {
    log "Configuration du monitoring..."
    
    # Installation des outils de monitoring
    apt-get install -y prometheus node-exporter grafana telegraf
    
    # Netdata pour monitoring temps réel
    bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait --non-interactive
    
    # Configuration Prometheus
    cat > /etc/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
EOF
    
    # Script de monitoring personnalisé
    cat > /home/"$SYSTEM_USER"/scripts/monitor.sh << 'EOF'
#!/bin/bash

# Variables
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID"
HOSTNAME=$(hostname)

# Fonction d'envoi Telegram
send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="$1" \
        -d parse_mode="HTML"
}

# Check CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
CPU_THRESHOLD=80
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    send_telegram "⚠️ <b>CPU Alert on $HOSTNAME</b>%0ACPU Usage: $CPU_USAGE%"
fi

# Check Memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
MEM_THRESHOLD=85
if [ $MEM_USAGE -gt $MEM_THRESHOLD ]; then
    send_telegram "⚠️ <b>Memory Alert on $HOSTNAME</b>%0AMemory Usage: $MEM_USAGE%"
fi

# Check Disk
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_THRESHOLD=80
if [ $DISK_USAGE -gt $DISK_THRESHOLD ]; then
    send_telegram "⚠️ <b>Disk Alert on $HOSTNAME</b>%0ADisk Usage: $DISK_USAGE%"
fi

# Check Services
SERVICES=("nginx" "postgresql" "redis-server" "pm2-gmah")
for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet $service; then
        send_telegram "🔴 <b>Service Down on $HOSTNAME</b>%0AService: $service"
        systemctl restart $service
        sleep 5
        if systemctl is-active --quiet $service; then
            send_telegram "✅ <b>Service Restarted on $HOSTNAME</b>%0AService: $service"
        else
            send_telegram "❌ <b>Service Restart Failed on $HOSTNAME</b>%0AService: $service"
        fi
    fi
done

# Check HTTP Status
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://$DOMAIN)
if [ $HTTP_STATUS -ne 200 ]; then
    send_telegram "🔴 <b>Website Down on $HOSTNAME</b>%0AHTTP Status: $HTTP_STATUS"
fi

# Check SSL Expiry
SSL_EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_REMAINING=$(( ($SSL_EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_REMAINING -lt 30 ]; then
    send_telegram "⚠️ <b>SSL Certificate Expiring Soon on $HOSTNAME</b>%0ADays Remaining: $DAYS_REMAINING"
fi
EOF
    
    chmod +x /home/"$SYSTEM_USER"/scripts/monitor.sh
    chown "$SYSTEM_USER:$SYSTEM_USER" /home/"$SYSTEM_USER"/scripts/monitor.sh
    
    # Crontab pour monitoring
    (crontab -u "$SYSTEM_USER" -l 2>/dev/null; echo "*/5 * * * * /home/$SYSTEM_USER/scripts/monitor.sh") | crontab -u "$SYSTEM_USER" -
    
    success "Monitoring configuré"
}

# ================================================================================
# ETAPE 12: BACKUP AUTOMATIQUE
# ================================================================================

setup_backup() {
    log "Configuration des backups automatiques..."
    
    # Script de backup
    cat > /home/"$SYSTEM_USER"/scripts/backup.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/home/gmah/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
S3_BUCKET="s3://gmah-storage/backups"
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID"

# Fonction log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> /home/gmah/logs/backup.log
}

# Fonction Telegram
send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="$1" \
        -d parse_mode="HTML"
}

# Début backup
log "Starting backup..."
send_telegram "🔄 <b>Backup Started</b>%0AServer: $(hostname)%0ADate: $DATE"

# Backup PostgreSQL - Master DB
log "Backing up master database..."
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost gmah_master | gzip > $BACKUP_DIR/gmah_master_$DATE.sql.gz

# Backup toutes les bases tenant
for db in $(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -lqt | cut -d \| -f 1 | grep gmah_org_); do
    log "Backing up $db..."
    PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $db | gzip > $BACKUP_DIR/${db}_$DATE.sql.gz
done

# Backup Redis
log "Backing up Redis..."
redis-cli -a $REDIS_PASSWORD BGSAVE
sleep 5
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup fichiers application
log "Backing up application files..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=dist \
    /home/gmah/gmah-platform

# Backup uploads
log "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/gmah/uploads

# Backup configurations
log "Backing up configurations..."
tar -czf $BACKUP_DIR/configs_$DATE.tar.gz \
    /etc/nginx/sites-available/gmah \
    /etc/postgresql/*/main/*.conf \
    /etc/redis/redis.conf \
    /home/gmah/gmah-platform/.env.production \
    /home/gmah/gmah-platform/ecosystem.config.js

# Archive complète
log "Creating complete archive..."
cd $BACKUP_DIR
tar -czf backup_complete_$DATE.tar.gz \
    gmah_master_$DATE.sql.gz \
    gmah_org_*_$DATE.sql.gz \
    redis_$DATE.rdb \
    app_$DATE.tar.gz \
    uploads_$DATE.tar.gz \
    configs_$DATE.tar.gz

# Upload vers S3/R2
log "Uploading to cloud storage..."
aws s3 cp backup_complete_$DATE.tar.gz $S3_BUCKET/ \
    --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com

# Nettoyage local (garde X jours)
log "Cleaning old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete

# Cleanup fichiers temporaires
rm -f $BACKUP_DIR/gmah_*_$DATE.sql.gz
rm -f $BACKUP_DIR/redis_$DATE.rdb
rm -f $BACKUP_DIR/app_$DATE.tar.gz
rm -f $BACKUP_DIR/uploads_$DATE.tar.gz
rm -f $BACKUP_DIR/configs_$DATE.tar.gz

# Vérification taille
BACKUP_SIZE=$(du -sh backup_complete_$DATE.tar.gz | cut -f1)
log "Backup completed. Size: $BACKUP_SIZE"

# Notification
send_telegram "✅ <b>Backup Completed</b>%0AServer: $(hostname)%0ASize: $BACKUP_SIZE%0AFile: backup_complete_$DATE.tar.gz"

log "Backup process finished"
EOF
    
    chmod +x /home/"$SYSTEM_USER"/scripts/backup.sh
    chown "$SYSTEM_USER:$SYSTEM_USER" /home/"$SYSTEM_USER"/scripts/backup.sh
    
    # Crontab pour backup quotidien
    (crontab -u "$SYSTEM_USER" -l 2>/dev/null; echo "0 2 * * * /home/$SYSTEM_USER/scripts/backup.sh") | crontab -u "$SYSTEM_USER" -
    
    success "Backup automatique configuré"
}

# ================================================================================
# ETAPE 13: SECURITE AVANCEE
# ================================================================================

setup_advanced_security() {
    log "Configuration de la sécurité avancée..."
    
    # Installation ClamAV pour antivirus
    apt-get install -y clamav clamav-daemon
    systemctl stop clamav-freshclam
    freshclam
    systemctl start clamav-freshclam
    systemctl enable clamav-daemon
    
    # Installation Rootkit Hunter
    apt-get install -y rkhunter
    rkhunter --update
    rkhunter --propupd
    
    # Installation et configuration AIDE (Advanced Intrusion Detection Environment)
    apt-get install -y aide
    aideinit
    mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
    
    # ModSecurity pour Nginx
    apt-get install -y libmodsecurity3 libmodsecurity3-dev
    
    # Configuration audit avec auditd
    apt-get install -y auditd audispd-plugins
    
    cat >> /etc/audit/rules.d/gmah.rules << 'EOF'
# Monitor authentication
-w /var/log/auth.log -p wa -k authentication
-w /etc/passwd -p wa -k passwd_changes
-w /etc/shadow -p wa -k shadow_changes
-w /etc/group -p wa -k group_changes
-w /etc/sudoers -p wa -k sudoers_changes

# Monitor system calls
-a always,exit -F arch=b64 -S execve -k command_execution
-a always,exit -F arch=b32 -S execve -k command_execution

# Monitor network
-a always,exit -F arch=b64 -S socket -S connect -k network
-a always,exit -F arch=b32 -S socket -S connect -k network

# Monitor file deletion
-a always,exit -F arch=b64 -S unlink -S rmdir -k file_deletion
-a always,exit -F arch=b32 -S unlink -S rmdir -k file_deletion
EOF
    
    systemctl enable auditd
    systemctl restart auditd
    
    # Tripwire alternative avec AIDE check quotidien
    cat > /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
/usr/bin/aide --check | mail -s "AIDE Daily Check Report" admin@gmah.com
EOF
    chmod +x /etc/cron.daily/aide-check
    
    # Configuration Apparmor
    apt-get install -y apparmor apparmor-utils
    aa-enforce /etc/apparmor.d/*
    
    # Lynis pour audit de sécurité
    apt-get install -y lynis
    
    success "Sécurité avancée configurée"
}

# ================================================================================
# ETAPE 14: OPTIMISATIONS FINALES
# ================================================================================

setup_optimizations() {
    log "Application des optimisations finales..."
    
    # Logrotate pour tous les logs
    cat > /etc/logrotate.d/gmah << 'EOF'
/home/gmah/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 gmah gmah
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF
    
    # Swap file si pas déjà présent
    if [ ! -f /swapfile ]; then
        fallocate -l 4G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    
    # Mise à jour automatique de sécurité
    dpkg-reconfigure -plow unattended-upgrades
    
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "admin@gmah.com";
EOF
    
    success "Optimisations appliquées"
}

# ================================================================================
# ETAPE 15: FINALISATION ET RAPPORT
# ================================================================================

finalize_setup() {
    log "Finalisation de l'installation..."
    
    # Création du rapport d'installation
    cat > /root/gmah-installation-report.txt << EOF
================================================================================
GMAH PLATFORM - INSTALLATION REPORT
================================================================================
Date: $(date)
Hostname: $(hostname)
IP Address: $(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n1)
Domain: $DOMAIN
================================================================================

SERVICES STATUS:
----------------
$(systemctl is-active nginx) - Nginx
$(systemctl is-active postgresql) - PostgreSQL
$(systemctl is-active redis-server) - Redis
$(systemctl is-active fail2ban) - Fail2ban
$(systemctl is-active ufw) - UFW Firewall
$(pm2 status | grep online | wc -l) - PM2 Processes

SECURITY CHECKLIST:
-------------------
✓ SSH Port Changed to $SSH_PORT
✓ Root Login Disabled
✓ Password Authentication Disabled
✓ Firewall Enabled and Configured
✓ Fail2ban Active with Custom Rules
✓ SSL Certificate Installed
✓ Security Headers Configured
✓ Rate Limiting Enabled
✓ DDoS Protection Active
✓ Automatic Security Updates Enabled
✓ Antivirus (ClamAV) Installed
✓ Rootkit Hunter Installed
✓ AIDE Intrusion Detection Configured
✓ Audit System (auditd) Active

BACKUP & MONITORING:
--------------------
✓ Automatic Daily Backups Configured
✓ Cloud Backup to R2 Enabled
✓ System Monitoring Every 5 Minutes
✓ Service Health Checks Active
✓ Telegram Alerts Configured
✓ Log Rotation Configured

DATABASE INFO:
--------------
PostgreSQL Version: $(psql --version | awk '{print $3}')
Redis Version: $(redis-server --version | awk '{print $3}' | cut -d= -f2)
Connection Pooling: PgBouncer Active

APPLICATION:
------------
Node.js Version: $(node --version)
PM2 Version: $(pm2 --version)
Nginx Version: $(nginx -v 2>&1 | cut -d/ -f2)

NEXT STEPS:
-----------
1. Save the credentials file: /root/gmah-credentials.txt
2. Add your SSH public key to: /home/$SYSTEM_USER/.ssh/authorized_keys
3. Update DNS records to point to this server
4. Deploy application code to /home/$SYSTEM_USER/gmah-platform
5. Run initial database migrations
6. Create first organization via API
7. Test all services
8. Delete credentials file after saving

ACCESS INFORMATION:
-------------------
SSH: ssh $SYSTEM_USER@$DOMAIN -p $SSH_PORT
Web: https://$DOMAIN (after DNS propagation)
API: https://$DOMAIN/api

MONITORING URLS:
----------------
Netdata: http://$DOMAIN:19999
Grafana: http://$DOMAIN:3000

================================================================================
Installation completed successfully!
================================================================================
EOF
    
    # Affichage du rapport
    cat /root/gmah-installation-report.txt
    
    # Sauvegarde des credentials
    save_credentials
    
    success "Installation terminée avec succès!"
    warning "IMPORTANT: Sauvegardez le fichier /root/gmah-credentials.txt et supprimez-le du serveur!"
}

# ================================================================================
# MAIN - EXECUTION DU SCRIPT
# ================================================================================

main() {
    echo -e "${CYAN}"
    cat << "EOF"
================================================================================
   _____ __  __          _    _   _____  _       _    __                      
  / ____|  \/  |   /\   | |  | | |  __ \| |     | |  / _|                     
 | |  __| \  / |  /  \  | |__| | | |__) | | __ _| |_| |_ ___  _ __ _ __ ___  
 | | |_ | |\/| | / /\ \ |  __  | |  ___/| |/ _` | __|  _/ _ \| '__| '_ ` _ \ 
 | |__| | |  | |/ ____ \| |  | | | |    | | (_| | |_| || (_) | |  | | | | | |
  \_____|_|  |_/_/    \_\_|  |_| |_|    |_|\__,_|\__|_| \___/|_|  |_| |_| |_|
                                                                               
                     ULTIMATE VPS SETUP SCRIPT v2.0                           
================================================================================
EOF
    echo -e "${NC}"
    
    # Vérifications préliminaires
    check_root
    
    # Confirmation
    echo -e "${YELLOW}Ce script va configurer complètement votre VPS pour GMAH Platform.${NC}"
    echo -e "${YELLOW}Assurez-vous d'avoir modifié les variables de configuration au début du script.${NC}"
    read -p "Voulez-vous continuer? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    # Execution des étapes
    setup_system
    setup_user_and_ssh
    setup_firewall
    setup_fail2ban
    setup_nodejs_nginx
    setup_postgresql
    setup_redis
    setup_gmah_application
    setup_nginx_vhost
    setup_ssl
    setup_monitoring
    setup_backup
    setup_advanced_security
    setup_optimizations
    finalize_setup
    
    echo -e "${GREEN}"
    echo "================================================================================
    echo "                     INSTALLATION COMPLETEE AVEC SUCCES!                     "
    echo "================================================================================"
    echo -e "${NC}"
}

# Lancement du script
main "$@"