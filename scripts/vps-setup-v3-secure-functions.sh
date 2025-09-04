#!/bin/bash

# ================================================================================
# FONCTIONS D'INSTALLATION SÉCURISÉES AVEC ÉCHAPPEMENT CORRECT
# ================================================================================

# Fonction d'échappement pour PostgreSQL
escape_postgres_password() {
    local password="$1"
    # Échapper les caractères spéciaux pour PostgreSQL
    echo "$password" | sed "s/'/''/g"
}

# Fonction d'échappement pour les commandes shell
escape_shell() {
    local str="$1"
    printf '%q' "$str"
}

# Fonction d'échappement pour les fichiers de configuration
escape_config() {
    local str="$1"
    # Échapper $ et " pour les fichiers de config
    echo "$str" | sed 's/\$/\\$/g' | sed 's/"/\\"/g'
}

# ================================================================================
# INSTALLATION POSTGRESQL SÉCURISÉE
# ================================================================================

install_postgresql_secure() {
    log INFO "Installation de PostgreSQL avec configuration sécurisée..."
    
    # Variables avec échappement
    local DB_USER="${DB_USER:-gmah}"
    local DB_PASSWORD="${DB_PASSWORD:-$(generate_secure_password 24)}"
    local DB_PASSWORD_ESCAPED=$(escape_postgres_password "$DB_PASSWORD")
    local DB_PASSWORD_SHELL=$(escape_shell "$DB_PASSWORD")
    
    # Backup si PostgreSQL déjà installé
    if systemctl is-active --quiet postgresql; then
        create_backup "postgresql"
        systemctl stop postgresql
    fi
    
    # Installation PostgreSQL 15
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
    echo "deb [signed-by=/etc/apt/trusted.gpg.d/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    apt-get update
    apt-get install -y postgresql-15 postgresql-client-15 postgresql-contrib-15 pgbouncer
    
    # Configuration sécurisée
    local PG_VERSION="15"
    local PG_CONFIG="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
    local PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    
    # Calcul dynamique des paramètres selon la RAM disponible
    local TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
    local SHARED_BUFFERS=$((TOTAL_MEM / 4))
    local EFFECTIVE_CACHE=$((TOTAL_MEM * 3 / 4))
    
    # Configuration PostgreSQL avec échappement correct
    cat >> "$PG_CONFIG" << EOF
# GMAH Secure Configuration
shared_buffers = ${SHARED_BUFFERS}MB
effective_cache_size = ${EFFECTIVE_CACHE}MB
max_connections = 200
ssl = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_statement = 'ddl'
EOF
    
    # Configuration pg_hba.conf sécurisée
    cat > "$PG_HBA" << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
# Reject all other connections
host    all             all             0.0.0.0/0               reject
host    all             all             ::/0                    reject
EOF
    
    systemctl restart postgresql
    
    # Création utilisateur avec mot de passe échappé correctement
    sudo -u postgres psql << EOF
-- Création utilisateur avec échappement correct
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD_ESCAPED}';
ALTER USER ${DB_USER} CREATEDB;
CREATE DATABASE gmah_master OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE gmah_master TO ${DB_USER};

-- Extensions de sécurité
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Audit
CREATE EXTENSION IF NOT EXISTS pgaudit;
EOF
    
    # Configuration PgBouncer avec échappement
    cat > /etc/pgbouncer/pgbouncer.ini << EOF
[databases]
gmah_master = host=127.0.0.1 port=5432 dbname=gmah_master
* = host=127.0.0.1 port=5432

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
server_tls_sslmode = require
server_tls_ca_file = /etc/ssl/certs/ca-certificates.crt
log_connections = 1
log_disconnections = 1
stats_users = ${DB_USER}
EOF
    
    # Création userlist avec mot de passe SCRAM
    local SCRAM_PASSWORD=$(echo -n "${DB_PASSWORD}${DB_USER}" | openssl dgst -sha256 -binary | base64)
    echo "\"${DB_USER}\" \"SCRAM-SHA-256\$4096:$(openssl rand -base64 16)\$$(openssl rand -base64 24):${SCRAM_PASSWORD}\"" > /etc/pgbouncer/userlist.txt
    chmod 600 /etc/pgbouncer/userlist.txt
    chown postgres:postgres /etc/pgbouncer/userlist.txt
    
    systemctl enable pgbouncer
    systemctl restart pgbouncer
    
    # Test de connexion avec échappement
    export PGPASSWORD="${DB_PASSWORD}"
    if psql -h localhost -p 6432 -U "${DB_USER}" -d gmah_master -c "SELECT 1;" &>/dev/null; then
        log SUCCESS "PostgreSQL installé et configuré avec succès"
    else
        log ERROR "Impossible de se connecter à PostgreSQL"
        return 1
    fi
    unset PGPASSWORD
    
    # Sauvegarde sécurisée des credentials
    save_db_credentials "${DB_USER}" "${DB_PASSWORD}"
    
    return 0
}

# ================================================================================
# INSTALLATION REDIS SÉCURISÉE
# ================================================================================

install_redis_secure() {
    log INFO "Installation de Redis avec configuration sécurisée..."
    
    local REDIS_PASSWORD="${REDIS_PASSWORD:-$(generate_secure_password 32)}"
    local REDIS_PASSWORD_ESCAPED=$(escape_config "$REDIS_PASSWORD")
    
    # Installation Redis
    apt-get install -y redis-server redis-sentinel redis-tools
    
    # Configuration sécurisée
    cat > /etc/redis/redis.conf << EOF
# Network
bind 127.0.0.1 ::1
protected-mode yes
port 6379
tcp-backlog 511

# Security
requirepass ${REDIS_PASSWORD_ESCAPED}
masterauth ${REDIS_PASSWORD_ESCAPED}

# ACL Configuration
aclfile /etc/redis/users.acl

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG "CONFIG_${REDIS_PASSWORD_ESCAPED}"
rename-command SHUTDOWN "SHUTDOWN_${REDIS_PASSWORD_ESCAPED}"

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
syslog-enabled yes

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# TLS/SSL
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-dh-params-file /etc/redis/tls/redis.dh
EOF
    
    # Création des certificats TLS
    mkdir -p /etc/redis/tls
    openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
        -keyout /etc/redis/tls/redis.key \
        -out /etc/redis/tls/redis.crt \
        -subj "/C=FR/ST=Paris/L=Paris/O=GMAH/CN=redis.local"
    openssl dhparam -out /etc/redis/tls/redis.dh 2048
    
    # ACL Users configuration
    cat > /etc/redis/users.acl << EOF
# Default user (disabled)
user default on nopass ~* &* +@all

# Application user
user gmah on >${REDIS_PASSWORD_ESCAPED} ~* &* +@all -@dangerous

# Read-only user for monitoring
user monitoring on >${REDIS_PASSWORD_ESCAPED}_monitor ~* &* +ping +info +config|get +client|list
EOF
    
    # Permissions
    chown redis:redis /etc/redis/*.conf /etc/redis/*.acl
    chown -R redis:redis /etc/redis/tls
    chmod 600 /etc/redis/*.conf /etc/redis/*.acl
    chmod 600 /etc/redis/tls/*
    
    systemctl restart redis-server
    
    # Test de connexion
    if redis-cli -a "${REDIS_PASSWORD}" ping | grep -q PONG; then
        log SUCCESS "Redis installé et configuré avec succès"
    else
        log ERROR "Impossible de se connecter à Redis"
        return 1
    fi
    
    return 0
}

# ================================================================================
# CONFIGURATION NGINX SÉCURISÉE
# ================================================================================

configure_nginx_secure() {
    log INFO "Configuration de Nginx avec sécurité maximale..."
    
    # Installation Nginx avec modules de sécurité
    apt-get install -y nginx nginx-extras libnginx-mod-http-geoip2 \
        libnginx-mod-http-headers-more-filter \
        libnginx-mod-http-lua
    
    # Configuration sécurisée principale
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;
load_module modules/ngx_http_geoip2_module.so;
load_module modules/ngx_http_headers_more_filter_module.so;

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
    more_clear_headers Server;
    more_set_headers 'X-Powered-By: GMAH Platform';
    
    # Security Headers (global)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https: wss:;" always;
    
    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Logging with anonymization
    map $remote_addr $remote_addr_anon {
        ~(?P<ip>\d+\.\d+\.\d+)\.    $ip.0;
        ~(?P<ip>[^:]+:[^:]+):       $ip::;
        default                      0.0.0.0;
    }
    
    log_format main_anon '$remote_addr_anon - $remote_user [$time_local] "$request" '
                         '$status $body_bytes_sent "$http_referer" '
                         '"$http_user_agent" rt=$request_time';
    
    access_log /var/log/nginx/access.log main_anon buffer=16k;
    error_log /var/log/nginx/error.log warn;
    
    # Rate Limiting Zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=strict:10m rate=2r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    # GeoIP2 for country blocking
    geoip2 /usr/share/GeoIP/GeoLite2-Country.mmdb {
        auto_reload 5m;
        $geoip2_metadata_country_build metadata build_epoch;
        $geoip2_data_country_code country iso_code;
        $geoip2_data_country_name country names en;
    }
    
    # Country blocking map
    map $geoip2_data_country_code $allowed_country {
        default yes;
        # Bloquer certains pays si nécessaire
        # CN no;  # Chine
        # RU no;  # Russie
        # KP no;  # Corée du Nord
    }
    
    # Security: Block suspicious user agents
    map $http_user_agent $blocked_agent {
        default 0;
        ~*malicious 1;
        ~*bot 1;
        ~*crawler 1;
        ~*spider 1;
        ~*scraper 1;
    }
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
    
    # Brotli
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
    
    # Include configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
    
    # Configuration ModSecurity
    cat > /etc/nginx/modsecurity/modsecurity.conf << 'EOF'
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess Off
SecRequestBodyLimit 13107200
SecRequestBodyNoFilesLimit 131072
SecRequestBodyLimitAction Reject
SecPcreMatchLimit 100000
SecPcreMatchLimitRecursion 100000
SecResponseBodyLimit 524288
SecResponseBodyLimitAction ProcessPartial
SecTmpDir /tmp/
SecDataDir /var/cache/modsecurity/
SecDebugLogLevel 0
SecAuditEngine RelevantOnly
SecAuditLogRelevantStatus "^(?:5|4(?!04))"
SecAuditLogParts ABDEFHIJZ
SecAuditLogType Serial
SecAuditLog /var/log/modsecurity/audit.log
SecArgumentSeparator &
SecCookieFormat 0
SecStatusEngine On
EOF
    
    # Test configuration
    nginx -t && systemctl reload nginx
    
    log SUCCESS "Nginx configuré avec sécurité maximale"
    return 0
}

# ================================================================================
# FONCTION DE SAUVEGARDE SÉCURISÉE DES CREDENTIALS
# ================================================================================

save_db_credentials() {
    local db_user="$1"
    local db_password="$2"
    local creds_file="/root/.gmah-db-credentials.enc"
    
    # Créer le fichier de credentials
    cat > /tmp/db_creds.txt << EOF
DB_USER=${db_user}
DB_PASSWORD=${db_password}
EOF
    
    # Chiffrer avec OpenSSL
    openssl enc -aes-256-cbc -salt -in /tmp/db_creds.txt -out "$creds_file" -k "${MASTER_KEY:-defaultkey}"
    
    # Nettoyer
    shred -vfz -n 3 /tmp/db_creds.txt
    rm -f /tmp/db_creds.txt
    
    chmod 600 "$creds_file"
    log INFO "Credentials sauvegardés de manière sécurisée dans $creds_file"
}

# Export des fonctions pour utilisation dans le script principal
export -f escape_postgres_password
export -f escape_shell
export -f escape_config
export -f install_postgresql_secure
export -f install_redis_secure
export -f configure_nginx_secure
export -f save_db_credentials