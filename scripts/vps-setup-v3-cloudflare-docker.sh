#!/bin/bash

# ================================================================================
# CLOUDFLARE TUNNEL & DOCKER SUPPORT
# ================================================================================

# ================================================================================
# CLOUDFLARE TUNNEL - ZERO TRUST NETWORK
# ================================================================================

setup_cloudflare_tunnel() {
    log INFO "Configuration de Cloudflare Tunnel (Zero Trust)..."
    
    local CF_TUNNEL_TOKEN="${CF_TUNNEL_TOKEN:-}"
    local CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-}"
    local DOMAIN="${DOMAIN:-gmah.com}"
    
    # Installation cloudflared
    log INFO "Installation de cloudflared..."
    
    # Détection architecture
    local ARCH=$(dpkg --print-architecture)
    case $ARCH in
        amd64)
            CF_ARCH="amd64"
            ;;
        arm64)
            CF_ARCH="arm64"
            ;;
        armhf)
            CF_ARCH="arm"
            ;;
        *)
            log ERROR "Architecture non supportée pour Cloudflare Tunnel: $ARCH"
            return 1
            ;;
    esac
    
    # Téléchargement et installation
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}.deb
    dpkg -i cloudflared-linux-${CF_ARCH}.deb
    rm cloudflared-linux-${CF_ARCH}.deb
    
    # Configuration interactive si token non fourni
    if [[ -z "$CF_TUNNEL_TOKEN" ]]; then
        log INFO "Configuration du tunnel Cloudflare..."
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo "1. Connectez-vous à: https://one.dash.cloudflare.com"
        echo "2. Allez dans Access > Tunnels"
        echo "3. Créez un nouveau tunnel nommé: gmah-tunnel"
        echo "4. Copiez le token du tunnel"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        read -p "Entrez le token du tunnel Cloudflare: " CF_TUNNEL_TOKEN
        
        if [[ -z "$CF_TUNNEL_TOKEN" ]]; then
            log WARNING "Token non fourni, tunnel non configuré"
            return 1
        fi
    fi
    
    # Création du service systemd pour le tunnel
    cat > /etc/systemd/system/cloudflared.service << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target
StartLimitIntervalSec=0

[Service]
Type=notify
ExecStart=/usr/local/bin/cloudflared tunnel --no-autoupdate run --token ${CF_TUNNEL_TOKEN}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared
KillMode=mixed
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
EOF
    
    # Configuration avancée du tunnel avec ingress rules
    mkdir -p /etc/cloudflared
    cat > /etc/cloudflared/config.yml << EOF
tunnel: gmah-tunnel
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # API Backend
  - hostname: api.${DOMAIN}
    service: http://localhost:3333
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      tlsTimeout: 10s
      tcpKeepAlive: 30s
      keepAliveConnections: 100
      keepAliveTimeout: 90s
      httpHostHeader: api.${DOMAIN}
      originServerName: api.${DOMAIN}
      caPool: /etc/ssl/certs/ca-certificates.crt
  
  # Frontend Application
  - hostname: ${DOMAIN}
    service: http://localhost:3000
    originRequest:
      noTLSVerify: false
      httpHostHeader: ${DOMAIN}
  
  # Wildcard pour sous-domaines (multi-tenant)
  - hostname: "*.${DOMAIN}"
    service: http://localhost:3000
    originRequest:
      noTLSVerify: false
  
  # WebSocket support
  - hostname: ws.${DOMAIN}
    service: ws://localhost:3333
    originRequest:
      noTLSVerify: false
  
  # Monitoring (Netdata) - avec authentification
  - hostname: monitor.${DOMAIN}
    service: http://localhost:19999
    originRequest:
      noTLSVerify: false
      httpHostHeader: monitor.${DOMAIN}
  
  # Grafana
  - hostname: grafana.${DOMAIN}
    service: http://localhost:3000
    originRequest:
      noTLSVerify: false
  
  # 404 pour tout le reste
  - service: http_status:404

# Configuration de logging
loglevel: info
logfile: /var/log/cloudflared.log

# Métriques Prometheus
metrics: localhost:2000

# Configuration de retry
retries: 5

# Configuration de grace period
grace-period: 30s

# Configuration de compression
compression-quality: 0  # 0 = auto

# WAF et sécurité (configuré côté Cloudflare Dashboard)
warp-routing:
  enabled: true
EOF
    
    # Configuration des Access Policies (Zero Trust)
    cat > /etc/cloudflared/access-policy.json << EOF
{
  "name": "GMAH Platform Access Policy",
  "include": [
    {
      "email_domain": {
        "domain": "${DOMAIN}"
      }
    }
  ],
  "exclude": [],
  "require": [
    {
      "group": {
        "name": "GMAH Admins"
      }
    }
  ],
  "isolation_required": false,
  "purpose_justification_required": false,
  "purpose_justification_prompt": "",
  "approval_required": false,
  "session_duration": "24h"
}
EOF
    
    # Activation et démarrage du service
    systemctl daemon-reload
    systemctl enable cloudflared
    systemctl start cloudflared
    
    # Vérification
    sleep 5
    if systemctl is-active --quiet cloudflared; then
        log SUCCESS "Cloudflare Tunnel configuré et actif"
        log INFO "URLs accessibles:"
        log INFO "  - https://${DOMAIN}"
        log INFO "  - https://api.${DOMAIN}"
        log INFO "  - https://monitor.${DOMAIN}"
        log INFO "  - https://*.${DOMAIN} (multi-tenant)"
    else
        log ERROR "Échec du démarrage du tunnel Cloudflare"
        journalctl -u cloudflared -n 20
        return 1
    fi
    
    # Configuration du firewall pour bloquer l'accès direct
    log INFO "Configuration du firewall pour forcer le trafic via Cloudflare..."
    
    # Obtenir les IPs Cloudflare
    curl -s https://www.cloudflare.com/ips-v4 > /tmp/cf-ips-v4.txt
    curl -s https://www.cloudflare.com/ips-v6 > /tmp/cf-ips-v6.txt
    
    # Configurer iptables pour n'accepter que le trafic Cloudflare
    while read -r ip; do
        iptables -A INPUT -p tcp --dport 80 -s "$ip" -j ACCEPT
        iptables -A INPUT -p tcp --dport 443 -s "$ip" -j ACCEPT
    done < /tmp/cf-ips-v4.txt
    
    while read -r ip; do
        ip6tables -A INPUT -p tcp --dport 80 -s "$ip" -j ACCEPT
        ip6tables -A INPUT -p tcp --dport 443 -s "$ip" -j ACCEPT
    done < /tmp/cf-ips-v6.txt
    
    # Bloquer tout autre trafic sur 80/443
    iptables -A INPUT -p tcp --dport 80 -j DROP
    iptables -A INPUT -p tcp --dport 443 -j DROP
    ip6tables -A INPUT -p tcp --dport 80 -j DROP
    ip6tables -A INPUT -p tcp --dport 443 -j DROP
    
    # Sauvegarder les règles
    netfilter-persistent save
    
    log SUCCESS "Firewall configuré pour Cloudflare uniquement"
    
    return 0
}

# ================================================================================
# DOCKER & DOCKER COMPOSE INSTALLATION
# ================================================================================

install_docker() {
    log INFO "Installation de Docker et Docker Compose..."
    
    # Suppression des anciennes versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Installation des dépendances
    apt-get update
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Ajout de la clé GPG officielle de Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Ajout du repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Installation de Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Configuration Docker pour production
    cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "metrics-addr": "127.0.0.1:9323",
  "experimental": true,
  "features": {
    "buildkit": true
  },
  "live-restore": true,
  "userland-proxy": false,
  "ip-forward": true,
  "iptables": true,
  "ipv6": false,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "debug": false,
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "insecure-registries": [],
  "exec-opts": ["native.cgroupdriver=systemd"],
  "bip": "172.17.0.1/16",
  "default-address-pools": [
    {
      "base": "172.18.0.0/16",
      "size": 24
    }
  ]
}
EOF
    
    # Configuration des limites système pour Docker
    cat >> /etc/sysctl.conf << EOF

# Docker optimizations
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
fs.may_detach_mounts = 1
EOF
    sysctl -p
    
    # Ajout de l'utilisateur au groupe docker
    usermod -aG docker ${SYSTEM_USER:-gmah}
    
    # Redémarrage de Docker
    systemctl daemon-reload
    systemctl restart docker
    systemctl enable docker
    
    # Vérification
    if docker run --rm hello-world &>/dev/null; then
        log SUCCESS "Docker installé avec succès"
        docker version --format 'Docker version {{.Server.Version}}'
    else
        log ERROR "Échec de l'installation Docker"
        return 1
    fi
    
    # Installation de ctop pour monitoring Docker
    wget https://github.com/bcicen/ctop/releases/latest/download/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
    chmod +x /usr/local/bin/ctop
    
    # Installation de Portainer CE (optionnel)
    read -p "Installer Portainer pour la gestion Docker? (y/n) [n]: " install_portainer
    install_portainer=${install_portainer:-n}
    
    if [[ "$install_portainer" == "y" ]]; then
        install_portainer_ce
    fi
    
    return 0
}

# ================================================================================
# PORTAINER CE (INTERFACE WEB DOCKER)
# ================================================================================

install_portainer_ce() {
    log INFO "Installation de Portainer CE..."
    
    # Création du volume
    docker volume create portainer_data
    
    # Lancement de Portainer avec SSL
    docker run -d \
        -p 9443:9443 \
        -p 8000:8000 \
        --name portainer \
        --restart=always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v portainer_data:/data \
        portainer/portainer-ce:latest \
        --ssl \
        --sslcert /certs/cert.pem \
        --sslkey /certs/key.pem
    
    # Configuration Nginx pour Portainer
    if [[ -f /etc/nginx/sites-available/gmah ]]; then
        cat >> /etc/nginx/sites-available/gmah << 'EOF'

# Portainer Proxy
server {
    listen 443 ssl http2;
    server_name portainer.${DOMAIN};
    
    location / {
        proxy_pass https://localhost:9443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
        nginx -t && systemctl reload nginx
    fi
    
    log SUCCESS "Portainer installé sur https://localhost:9443"
    
    return 0
}

# ================================================================================
# DOCKER COMPOSE POUR GMAH PLATFORM
# ================================================================================

create_docker_compose() {
    log INFO "Création de la configuration Docker Compose pour GMAH..."
    
    mkdir -p /home/${SYSTEM_USER:-gmah}/gmah-platform/docker
    
    cat > /home/${SYSTEM_USER:-gmah}/gmah-platform/docker/docker-compose.yml << 'EOF'
version: '3.9'

services:
  # PostgreSQL avec replication
  postgres-master:
    image: postgres:15-alpine
    container_name: gmah-postgres-master
    restart: always
    environment:
      POSTGRES_DB: gmah_master
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
      POSTGRES_HOST_AUTH_METHOD: scram-sha-256
    volumes:
      - postgres_master_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # PostgreSQL Slave (Read Replica)
  postgres-slave:
    image: postgres:15-alpine
    container_name: gmah-postgres-slave
    restart: always
    environment:
      POSTGRES_DB: gmah_master
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_MASTER_SERVICE: postgres-master
    volumes:
      - postgres_slave_data:/var/lib/postgresql/data
    depends_on:
      postgres-master:
        condition: service_healthy
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # Redis avec persistence
  redis:
    image: redis:7-alpine
    container_name: gmah-redis
    restart: always
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G

  # PgBouncer pour connection pooling
  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: gmah-pgbouncer
    restart: always
    environment:
      DATABASES_HOST: postgres-master
      DATABASES_PORT: 5432
      DATABASES_DBNAME: gmah_master
      DATABASES_USER: ${DB_USER}
      DATABASES_PASSWORD: ${DB_PASSWORD}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
    ports:
      - "127.0.0.1:6432:6432"
    depends_on:
      - postgres-master
    networks:
      - gmah-network

  # Backend API
  backend:
    build:
      context: ../
      dockerfile: docker/Dockerfile.backend
    container_name: gmah-backend
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@pgbouncer:6432/gmah_master
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3333
    volumes:
      - ../apps/api:/app
      - /app/node_modules
      - uploads:/app/uploads
    ports:
      - "127.0.0.1:3333:3333"
    depends_on:
      - postgres-master
      - redis
      - pgbouncer
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - gmah-network
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3

  # Frontend
  frontend:
    build:
      context: ../
      dockerfile: docker/Dockerfile.frontend
    container_name: gmah-frontend
    restart: always
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: http://backend:3333
      PORT: 3000
    volumes:
      - ../apps/web:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - backend
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # Worker pour jobs asynchrones
  worker:
    build:
      context: ../
      dockerfile: docker/Dockerfile.worker
    container_name: gmah-worker
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-master:5432/gmah_master
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    volumes:
      - ../apps/worker:/app
      - /app/node_modules
    depends_on:
      - postgres-master
      - redis
    networks:
      - gmah-network
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M

  # Elasticsearch pour recherche et logs
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: gmah-elasticsearch
    restart: always
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "127.0.0.1:9200:9200"
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  # Kibana pour visualisation des logs
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: gmah-kibana
    restart: always
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "127.0.0.1:5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # Backup automatique
  backup:
    image: prodrigestivill/postgres-backup-local:latest
    container_name: gmah-backup
    restart: always
    environment:
      POSTGRES_HOST: postgres-master
      POSTGRES_DB: gmah_master
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 30
      BACKUP_KEEP_WEEKS: 12
      BACKUP_KEEP_MONTHS: 12
      HEALTHCHECK_PORT: 8080
    volumes:
      - ./backups:/backups
    depends_on:
      - postgres-master
    networks:
      - gmah-network

  # Monitoring avec Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: gmah-prometheus
    restart: always
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # Grafana pour dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: gmah-grafana
    restart: always
    environment:
      - GF_SECURITY_ADMIN_USER=${ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
      - GF_INSTALL_PLUGINS=redis-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "127.0.0.1:3001:3000"
    depends_on:
      - prometheus
    networks:
      - gmah-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

networks:
  gmah-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_master_data:
  postgres_slave_data:
  redis_data:
  uploads:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
EOF
    
    # Création des Dockerfiles
    create_dockerfiles
    
    # Script de démarrage
    cat > /home/${SYSTEM_USER:-gmah}/gmah-platform/docker/start.sh << 'EOF'
#!/bin/bash
set -e

# Chargement des variables d'environnement
export $(cat .env | grep -v '^#' | xargs)

# Pull des dernières images
docker-compose pull

# Build des images custom
docker-compose build --parallel

# Démarrage des services de base
docker-compose up -d postgres-master redis

# Attente que les services soient prêts
sleep 10

# Démarrage des autres services
docker-compose up -d

# Affichage des statuts
docker-compose ps

echo "GMAH Platform démarré avec Docker Compose!"
echo "Services disponibles:"
echo "  - Backend API: http://localhost:3333"
echo "  - Frontend: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - Elasticsearch: http://localhost:9200"
echo "  - Kibana: http://localhost:5601"
echo "  - Grafana: http://localhost:3001"
echo "  - Prometheus: http://localhost:9090"
EOF
    
    chmod +x /home/${SYSTEM_USER:-gmah}/gmah-platform/docker/start.sh
    
    log SUCCESS "Configuration Docker Compose créée"
    
    return 0
}

# ================================================================================
# CREATION DES DOCKERFILES
# ================================================================================

create_dockerfiles() {
    local DOCKER_DIR="/home/${SYSTEM_USER:-gmah}/gmah-platform/docker"
    
    # Dockerfile Backend
    cat > $DOCKER_DIR/Dockerfile.backend << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --only=production

# Copie du code source
COPY apps/api ./apps/api
COPY libs ./libs
COPY prisma ./prisma

# Build
RUN npm run build:api

# Stage de production
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copie des fichiers depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# User non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3333

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/apps/api/main.js"]
EOF
    
    # Dockerfile Frontend
    cat > $DOCKER_DIR/Dockerfile.frontend << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# Copie du code source
COPY apps/web ./apps/web
COPY libs ./libs

# Build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build:web

# Stage de production
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copie depuis le builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# User non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:web"]
EOF
    
    # Dockerfile Worker
    cat > $DOCKER_DIR/Dockerfile.worker << 'EOF'
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copie du code
COPY apps/worker ./apps/worker
COPY libs ./libs

# Build
RUN npm run build:worker

# User non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/apps/worker/main.js"]
EOF
    
    log SUCCESS "Dockerfiles créés"
}

# ================================================================================
# K3S (LIGHTWEIGHT KUBERNETES) OPTIONNEL
# ================================================================================

install_k3s() {
    log INFO "Installation de K3s (Kubernetes léger)..."
    
    # Installation K3s
    curl -sfL https://get.k3s.io | sh -s - \
        --disable traefik \
        --write-kubeconfig-mode 644 \
        --node-name gmah-master
    
    # Installation kubectl
    snap install kubectl --classic
    
    # Configuration kubeconfig pour l'utilisateur
    mkdir -p /home/${SYSTEM_USER:-gmah}/.kube
    cp /etc/rancher/k3s/k3s.yaml /home/${SYSTEM_USER:-gmah}/.kube/config
    chown -R ${SYSTEM_USER:-gmah}:${SYSTEM_USER:-gmah} /home/${SYSTEM_USER:-gmah}/.kube
    
    # Installation Helm
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    
    # Ajout des repos Helm essentiels
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Installation Nginx Ingress Controller
    helm install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=ClusterIP \
        --set controller.metrics.enabled=true
    
    # Installation Cert-Manager pour SSL
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    # Création du namespace GMAH
    kubectl create namespace gmah
    
    # Création des manifests Kubernetes pour GMAH
    create_k8s_manifests
    
    # Vérification
    if kubectl get nodes | grep -q Ready; then
        log SUCCESS "K3s installé avec succès"
        kubectl get nodes
    else
        log ERROR "Échec de l'installation K3s"
        return 1
    fi
    
    return 0
}

# ================================================================================
# MANIFESTS KUBERNETES POUR GMAH
# ================================================================================

create_k8s_manifests() {
    local K8S_DIR="/home/${SYSTEM_USER:-gmah}/gmah-platform/k8s"
    mkdir -p $K8S_DIR
    
    # Namespace et ConfigMap
    cat > $K8S_DIR/01-namespace.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: gmah
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: gmah-config
  namespace: gmah
data:
  NODE_ENV: "production"
  API_PORT: "3333"
  FRONTEND_PORT: "3000"
EOF
    
    # Secret pour les credentials
    cat > $K8S_DIR/02-secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: gmah-secrets
  namespace: gmah
type: Opaque
stringData:
  db-password: "${DB_PASSWORD}"
  redis-password: "${REDIS_PASSWORD}"
  jwt-secret: "${JWT_SECRET}"
EOF
    
    # PostgreSQL StatefulSet
    cat > $K8S_DIR/03-postgres.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: gmah
spec:
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: postgres
  clusterIP: None
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: gmah
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: gmah_master
            - name: POSTGRES_USER
              value: gmah
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gmah-secrets
                  key: db-password
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
EOF
    
    # Redis Deployment
    cat > $K8S_DIR/04-redis.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: gmah
spec:
  ports:
    - port: 6379
      targetPort: 6379
  selector:
    app: redis
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: gmah
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - --requirepass
            - $(REDIS_PASSWORD)
            - --maxmemory
            - 2gb
            - --maxmemory-policy
            - allkeys-lru
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gmah-secrets
                  key: redis-password
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "2Gi"
              cpu: "500m"
EOF
    
    # Backend Deployment
    cat > $K8S_DIR/05-backend.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: gmah
spec:
  ports:
    - port: 3333
      targetPort: 3333
  selector:
    app: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: gmah
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: gmah/backend:latest
          ports:
            - containerPort: 3333
          env:
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: gmah-config
                  key: NODE_ENV
            - name: DATABASE_URL
              value: postgresql://gmah:$(DB_PASSWORD)@postgres:5432/gmah_master
            - name: REDIS_URL
              value: redis://:$(REDIS_PASSWORD)@redis:6379
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: gmah-secrets
                  key: jwt-secret
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gmah-secrets
                  key: db-password
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: gmah-secrets
                  key: redis-password
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3333
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3333
            initialDelaySeconds: 10
            periodSeconds: 5
EOF
    
    # Ingress
    cat > $K8S_DIR/06-ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gmah-ingress
  namespace: gmah
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "30"
    nginx.ingress.kubernetes.io/limit-connections: "10"
spec:
  tls:
    - hosts:
        - ${DOMAIN}
        - api.${DOMAIN}
        - "*.${DOMAIN}"
      secretName: gmah-tls
  rules:
    - host: ${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
    - host: api.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3333
EOF
    
    log SUCCESS "Manifests Kubernetes créés dans $K8S_DIR"
}

# Export des fonctions
export -f setup_cloudflare_tunnel
export -f install_docker
export -f install_portainer_ce
export -f create_docker_compose
export -f create_dockerfiles
export -f install_k3s
export -f create_k8s_manifests