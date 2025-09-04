# Guide de Déploiement GMAH Platform

## Prérequis

- VPS avec Ubuntu 22.04 LTS
- Minimum 8GB RAM, 4 vCPU
- Domaine configuré (gmah.com)
- Compte Cloudflare avec R2 activé

## 1. Configuration VPS Initial

### Connexion et sécurisation
```bash
# Connexion SSH
ssh root@your-vps-ip

# Mise à jour système
apt update && apt upgrade -y

# Création utilisateur
adduser gmah
usermod -aG sudo gmah

# Configuration SSH
nano /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no
systemctl restart sshd

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### Installation des dépendances
```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# PostgreSQL 15
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
apt update
apt install -y postgresql-15 postgresql-client-15

# Redis
apt install -y redis-server

# Nginx
apt install -y nginx

# PM2
npm install -g pm2

# Git & Build tools
apt install -y git build-essential
```

## 2. Configuration PostgreSQL

```bash
# Configuration PostgreSQL pour multi-tenant
sudo -u postgres psql

-- Créer utilisateur
CREATE USER gmah WITH PASSWORD 'your-secure-password';
ALTER USER gmah CREATEDB;

-- Créer base master
CREATE DATABASE gmah_master OWNER gmah;
\q

# Configuration postgresql.conf
nano /etc/postgresql/15/main/postgresql.conf
# max_connections = 200
# shared_buffers = 4GB
# work_mem = 4MB

# Configuration pg_hba.conf
nano /etc/postgresql/15/main/pg_hba.conf
# local   all   gmah   md5
# host    all   gmah   127.0.0.1/32   md5

systemctl restart postgresql
```

## 3. Configuration Redis

```bash
nano /etc/redis/redis.conf
# maxmemory 2gb
# maxmemory-policy allkeys-lru
# bind 127.0.0.1
# requirepass your-redis-password

systemctl restart redis-server
```

## 4. Déploiement Application

```bash
# Clone repository
cd /home/gmah
git clone https://github.com/your-org/gmah-platform.git
cd gmah-platform

# Installation dépendances
npm install

# Build application
npm run build

# Configuration environnement
cp .env.example .env.production
nano .env.production
```

### Configuration .env.production
```env
# Database
DATABASE_URL=postgresql://gmah:password@localhost:5432/gmah_master
DATABASE_URL_BASE=postgresql://gmah:password@localhost:5432/

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-very-long-secret-key
JWT_EXPIRATION=7d

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=gmah-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Application
NODE_ENV=production
API_PORT=3333
FRONTEND_URL=https://gmah.com
```

## 5. Configuration Nginx

```nginx
# /etc/nginx/sites-available/gmah
server {
    listen 80;
    server_name gmah.com *.gmah.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gmah.com *.gmah.com;

    ssl_certificate /etc/letsencrypt/live/gmah.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gmah.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        alias /home/gmah/gmah-platform/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Activation
ln -s /etc/nginx/sites-available/gmah /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 6. SSL avec Certbot

```bash
# Installation Certbot
apt install -y certbot python3-certbot-nginx

# Génération certificat wildcard
certbot certonly --nginx -d gmah.com -d *.gmah.com

# Auto-renouvellement
certbot renew --dry-run
```

## 7. Configuration PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'gmah-api',
      script: 'dist/apps/api/main.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3333
      },
      error_file: '/home/gmah/logs/api-error.log',
      out_file: '/home/gmah/logs/api-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'gmah-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/home/gmah/gmah-platform/apps/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/gmah/logs/web-error.log',
      out_file: '/home/gmah/logs/web-out.log'
    }
  ]
};
```

```bash
# Démarrage avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8. Configuration Cloudflare R2

```bash
# Installation AWS CLI (compatible R2)
apt install -y awscli

# Configuration
aws configure
# AWS Access Key ID: R2_ACCESS_KEY_ID
# AWS Secret Access Key: R2_SECRET_ACCESS_KEY
# Default region: auto
# Default output: json

# Création bucket
aws s3api create-bucket \
  --bucket gmah-storage \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com

# Test upload
aws s3 cp test.txt s3://gmah-storage/ \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com
```

## 9. Scripts de Maintenance

### Backup automatique
```bash
#!/bin/bash
# /home/gmah/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/gmah/backups"

# Backup Master DB
pg_dump gmah_master > $BACKUP_DIR/gmah_master_$DATE.sql

# Backup toutes les bases tenant
for db in $(psql -U gmah -lqt | cut -d \| -f 1 | grep gmah_org_); do
  pg_dump $db > $BACKUP_DIR/${db}_$DATE.sql
done

# Compression
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/*_$DATE.sql

# Upload vers R2
aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz \
  s3://gmah-storage/backups/ \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com

# Nettoyage local (garde 7 jours)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Monitoring
```bash
#!/bin/bash
# /home/gmah/scripts/monitor.sh

# Check services
services=("nginx" "postgresql" "redis-server")
for service in "${services[@]}"; do
  if ! systemctl is-active --quiet $service; then
    echo "$service is down!" | mail -s "Alert: $service down" admin@gmah.com
    systemctl restart $service
  fi
done

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "Disk usage is at $DISK_USAGE%" | mail -s "Alert: Disk space" admin@gmah.com
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -gt 90 ]; then
  echo "Memory usage is at $MEM_USAGE%" | mail -s "Alert: Memory" admin@gmah.com
fi
```

### Crontab
```bash
crontab -e

# Backup quotidien à 2h
0 2 * * * /home/gmah/scripts/backup.sh

# Monitoring toutes les 5 minutes
*/5 * * * * /home/gmah/scripts/monitor.sh

# Renouvellement SSL
0 0 * * 0 certbot renew --quiet
```

## 10. Déploiement avec CI/CD

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/gmah/gmah-platform
            git pull origin main
            npm install
            npm run build
            pm2 reload all
```

## 11. Première Organisation

```bash
# Créer première organisation via API
curl -X POST https://gmah.com/api/organizations/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "GMAH Paris",
    "slug": "paris",
    "adminEmail": "admin@paris.gmah.com",
    "adminName": "Admin Name",
    "address": "123 Rue Example",
    "city": "Paris",
    "postalCode": "75001",
    "country": "France",
    "phoneNumber": "+33123456789",
    "acceptTerms": true,
    "acceptDataProcessing": true
  }'
```

## Checklist Post-Déploiement

- [ ] SSL fonctionnel (https://gmah.com)
- [ ] Subdomains fonctionnels (*.gmah.com)
- [ ] API accessible (/api/health)
- [ ] Frontend accessible
- [ ] PostgreSQL sécurisé
- [ ] Redis sécurisé
- [ ] Backups configurés
- [ ] Monitoring actif
- [ ] Logs centralisés
- [ ] Firewall configuré
- [ ] Fail2ban installé
- [ ] PM2 startup configuré
- [ ] R2 storage connecté
- [ ] Première organisation créée

## Support & Maintenance

### Logs
```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

### Updates
```bash
# Système
apt update && apt upgrade -y

# Application
cd /home/gmah/gmah-platform
git pull
npm install
npm run build
pm2 reload all
```

### Rollback
```bash
# Via Git
git log --oneline -10
git checkout <commit-hash>
npm install
npm run build
pm2 reload all
```