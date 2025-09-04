#!/bin/bash

# ================================================================================
# SYSTÈME DE BACKUP ET RESTORE AVANCÉ
# ================================================================================

# ================================================================================
# CONFIGURATION BACKUP
# ================================================================================

setup_advanced_backup() {
    log INFO "Configuration du système de backup avancé..."
    
    local BACKUP_DIR="/opt/gmah-backup"
    local BACKUP_CONFIG="$BACKUP_DIR/backup.conf"
    
    mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,scripts,restore,temp}
    
    # Configuration principale du backup
    cat > "$BACKUP_CONFIG" << EOF
# GMAH Platform Backup Configuration
BACKUP_ROOT="$BACKUP_DIR"
BACKUP_TEMP="$BACKUP_DIR/temp"
BACKUP_DAILY="$BACKUP_DIR/daily"
BACKUP_WEEKLY="$BACKUP_DIR/weekly"
BACKUP_MONTHLY="$BACKUP_DIR/monthly"

# Retention Policy
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=12

# Database
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="${DB_USER:-gmah}"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="gmah_master"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# S3/R2 Configuration
S3_BUCKET="${R2_BUCKET_NAME:-gmah-storage}"
S3_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
S3_ACCESS_KEY="${R2_ACCESS_KEY_ID}"
S3_SECRET_KEY="${R2_SECRET_ACCESS_KEY}"

# Encryption
ENCRYPTION_ENABLED="true"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"

# Notification
NOTIFY_EMAIL="${ADMIN_EMAIL:-admin@gmah.com}"
NOTIFY_TELEGRAM="${TELEGRAM_CHAT_ID}"
TELEGRAM_TOKEN="${TELEGRAM_BOT_TOKEN}"

# Backup Paths
PATHS_TO_BACKUP=(
    "/home/gmah/gmah-platform"
    "/home/gmah/uploads"
    "/etc/nginx"
    "/etc/postgresql"
    "/etc/redis"
    "/var/log/gmah"
)

# Exclude Patterns
EXCLUDE_PATTERNS=(
    "*/node_modules/*"
    "*/.git/*"
    "*/dist/*"
    "*/.next/*"
    "*.log"
    "*/temp/*"
    "*/cache/*"
)
EOF
    
    # ================================================================================
    # SCRIPT DE BACKUP PRINCIPAL
    # ================================================================================
    
    cat > "$BACKUP_DIR/scripts/backup-master.sh" << 'EOF'
#!/bin/bash

set -euo pipefail

# Chargement de la configuration
source /opt/gmah-backup/backup.conf

# Variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gmah-backup-${TIMESTAMP}"
BACKUP_TEMP_DIR="${BACKUP_TEMP}/${BACKUP_NAME}"
LOG_FILE="${BACKUP_ROOT}/logs/backup-${TIMESTAMP}.log"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction de notification
notify() {
    local level=$1
    local message=$2
    
    # Email notification
    if [[ -n "$NOTIFY_EMAIL" ]]; then
        echo "$message" | mail -s "GMAH Backup $level" "$NOTIFY_EMAIL"
    fi
    
    # Telegram notification
    if [[ -n "$NOTIFY_TELEGRAM" && -n "$TELEGRAM_TOKEN" ]]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -d chat_id="${NOTIFY_TELEGRAM}" \
            -d text="🔄 GMAH Backup ${level}: ${message}" \
            -d parse_mode="HTML" &>/dev/null
    fi
}

# Fonction de nettoyage
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "${BACKUP_TEMP_DIR}"
}

trap cleanup EXIT

# ================================================================================
# DÉBUT DU BACKUP
# ================================================================================

log "Starting GMAH Platform backup..."
notify "INFO" "Backup started at ${TIMESTAMP}"

# Création du répertoire temporaire
mkdir -p "${BACKUP_TEMP_DIR}"
mkdir -p "$(dirname "$LOG_FILE")"

# ================================================================================
# 1. BACKUP PostgreSQL
# ================================================================================

log "Backing up PostgreSQL databases..."

# Backup global (roles et tablespaces)
PGPASSWORD="${DB_PASSWORD}" pg_dumpall \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    --globals-only \
    > "${BACKUP_TEMP_DIR}/postgres_globals.sql"

# Backup base master
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --verbose \
    --no-owner \
    --no-privileges \
    --compress=9 \
    > "${BACKUP_TEMP_DIR}/postgres_${DB_NAME}.dump"

# Backup toutes les bases tenant
for db in $(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -lqt | cut -d \| -f 1 | grep gmah_org_); do
    log "Backing up tenant database: $db"
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "$db" \
        --format=custom \
        --compress=9 \
        > "${BACKUP_TEMP_DIR}/postgres_${db}.dump"
done

# ================================================================================
# 2. BACKUP Redis
# ================================================================================

log "Backing up Redis..."

# Force BGSAVE
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" BGSAVE

# Attendre la fin du BGSAVE
while [ "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" LASTSAVE)" -eq "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" LASTSAVE)" ]; do
    sleep 1
done

# Copier le dump
cp /var/lib/redis/dump.rdb "${BACKUP_TEMP_DIR}/redis_dump.rdb"

# Export aussi en format AOF pour plus de sécurité
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" BGREWRITEAOF
sleep 5
if [[ -f /var/lib/redis/appendonly.aof ]]; then
    cp /var/lib/redis/appendonly.aof "${BACKUP_TEMP_DIR}/redis_appendonly.aof"
fi

# ================================================================================
# 3. BACKUP Elasticsearch (si présent)
# ================================================================================

if systemctl is-active --quiet elasticsearch; then
    log "Backing up Elasticsearch indices..."
    
    # Création d'un snapshot repository
    curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d '{
        "type": "fs",
        "settings": {
            "location": "'${BACKUP_TEMP_DIR}'/elasticsearch",
            "compress": true
        }
    }'
    
    # Création du snapshot
    curl -X PUT "localhost:9200/_snapshot/backup/snapshot_${TIMESTAMP}?wait_for_completion=true" -H 'Content-Type: application/json' -d '{
        "indices": "gmah-*",
        "include_global_state": true
    }'
fi

# ================================================================================
# 4. BACKUP Fichiers Application
# ================================================================================

log "Backing up application files..."

for path in "${PATHS_TO_BACKUP[@]}"; do
    if [[ -e "$path" ]]; then
        log "Backing up: $path"
        
        # Création du nom de l'archive basé sur le chemin
        archive_name=$(echo "$path" | sed 's/\//_/g' | sed 's/^_//').tar.gz
        
        # Création des exclusions
        exclude_opts=""
        for pattern in "${EXCLUDE_PATTERNS[@]}"; do
            exclude_opts="$exclude_opts --exclude='$pattern'"
        done
        
        # Création de l'archive
        eval tar -czf "${BACKUP_TEMP_DIR}/${archive_name}" \
            $exclude_opts \
            "$path" 2>/dev/null
    else
        log "Warning: Path not found: $path"
    fi
done

# ================================================================================
# 5. BACKUP Configuration Docker (si présent)
# ================================================================================

if command -v docker &>/dev/null; then
    log "Backing up Docker configurations..."
    
    # Export des images Docker
    docker images --format "{{.Repository}}:{{.Tag}}" | grep gmah | while read image; do
        log "Exporting Docker image: $image"
        image_file=$(echo "$image" | sed 's/[:/]/_/g').tar
        docker save "$image" > "${BACKUP_TEMP_DIR}/docker_${image_file}"
    done
    
    # Export des volumes Docker
    docker volume ls --format "{{.Name}}" | grep gmah | while read volume; do
        log "Backing up Docker volume: $volume"
        docker run --rm -v "$volume":/data -v "${BACKUP_TEMP_DIR}":/backup \
            alpine tar -czf "/backup/docker_volume_${volume}.tar.gz" /data
    done
    
    # Sauvegarde des configurations Docker Compose
    if [[ -f /home/gmah/gmah-platform/docker-compose.yml ]]; then
        cp /home/gmah/gmah-platform/docker-compose.yml "${BACKUP_TEMP_DIR}/"
        cp /home/gmah/gmah-platform/.env* "${BACKUP_TEMP_DIR}/" 2>/dev/null || true
    fi
fi

# ================================================================================
# 6. BACKUP Kubernetes (si présent)
# ================================================================================

if command -v kubectl &>/dev/null; then
    log "Backing up Kubernetes configurations..."
    
    # Export de tous les objets du namespace gmah
    kubectl get all -n gmah -o yaml > "${BACKUP_TEMP_DIR}/k8s_gmah_namespace.yaml"
    kubectl get configmap -n gmah -o yaml > "${BACKUP_TEMP_DIR}/k8s_configmaps.yaml"
    kubectl get secret -n gmah -o yaml > "${BACKUP_TEMP_DIR}/k8s_secrets.yaml"
    kubectl get pvc -n gmah -o yaml > "${BACKUP_TEMP_DIR}/k8s_pvc.yaml"
fi

# ================================================================================
# 7. MÉTADONNÉES ET VÉRIFICATION
# ================================================================================

log "Creating backup metadata..."

# Création du fichier de métadonnées
cat > "${BACKUP_TEMP_DIR}/backup_metadata.json" << EOMETA
{
    "timestamp": "${TIMESTAMP}",
    "hostname": "$(hostname)",
    "backup_version": "3.0",
    "system": {
        "os": "$(lsb_release -d | cut -f2)",
        "kernel": "$(uname -r)",
        "architecture": "$(uname -m)"
    },
    "databases": [
        $(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -lqt | cut -d \| -f 1 | grep gmah | sed 's/^/"/' | sed 's/$/"/' | paste -sd,)
    ],
    "sizes": {
        "total": "$(du -sh ${BACKUP_TEMP_DIR} | cut -f1)",
        "postgres": "$(du -sh ${BACKUP_TEMP_DIR}/*.dump 2>/dev/null | tail -1 | cut -f1)",
        "redis": "$(du -sh ${BACKUP_TEMP_DIR}/redis* 2>/dev/null | tail -1 | cut -f1)",
        "files": "$(du -sh ${BACKUP_TEMP_DIR}/*.tar.gz 2>/dev/null | tail -1 | cut -f1)"
    },
    "checksums": {}
}
EOMETA

# Calcul des checksums
log "Calculating checksums..."
find "${BACKUP_TEMP_DIR}" -type f -exec sha256sum {} \; > "${BACKUP_TEMP_DIR}/checksums.sha256"

# ================================================================================
# 8. COMPRESSION ET CHIFFREMENT
# ================================================================================

log "Compressing backup..."

cd "${BACKUP_TEMP}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
    log "Encrypting backup..."
    openssl enc -aes-256-cbc -salt \
        -in "${BACKUP_NAME}.tar.gz" \
        -out "${BACKUP_NAME}.tar.gz.enc" \
        -k "${ENCRYPTION_KEY}"
    
    rm "${BACKUP_NAME}.tar.gz"
    FINAL_BACKUP="${BACKUP_NAME}.tar.gz.enc"
else
    FINAL_BACKUP="${BACKUP_NAME}.tar.gz"
fi

# ================================================================================
# 9. DISTRIBUTION DU BACKUP
# ================================================================================

# Déterminer le type de backup (daily, weekly, monthly)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

if [[ $DAY_OF_MONTH -eq 1 ]]; then
    BACKUP_TYPE="monthly"
    DEST_DIR="${BACKUP_MONTHLY}"
elif [[ $DAY_OF_WEEK -eq 7 ]]; then
    BACKUP_TYPE="weekly"
    DEST_DIR="${BACKUP_WEEKLY}"
else
    BACKUP_TYPE="daily"
    DEST_DIR="${BACKUP_DAILY}"
fi

log "Moving backup to ${BACKUP_TYPE} storage..."
mv "${BACKUP_TEMP}/${FINAL_BACKUP}" "${DEST_DIR}/"

# ================================================================================
# 10. UPLOAD VERS S3/R2
# ================================================================================

if [[ -n "$S3_BUCKET" && -n "$S3_ACCESS_KEY" ]]; then
    log "Uploading backup to S3/R2..."
    
    AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
    AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
    aws s3 cp "${DEST_DIR}/${FINAL_BACKUP}" \
        "s3://${S3_BUCKET}/backups/${BACKUP_TYPE}/${FINAL_BACKUP}" \
        --endpoint-url "${S3_ENDPOINT}" \
        --storage-class GLACIER
    
    if [[ $? -eq 0 ]]; then
        log "Backup successfully uploaded to S3/R2"
    else
        log "ERROR: Failed to upload backup to S3/R2"
        notify "ERROR" "Failed to upload backup to cloud storage"
    fi
fi

# ================================================================================
# 11. ROTATION DES BACKUPS
# ================================================================================

log "Rotating old backups..."

# Rotation daily
find "${BACKUP_DAILY}" -name "*.tar.gz*" -mtime +${DAILY_RETENTION} -delete

# Rotation weekly
find "${BACKUP_WEEKLY}" -name "*.tar.gz*" -mtime +$((WEEKLY_RETENTION * 7)) -delete

# Rotation monthly
find "${BACKUP_MONTHLY}" -name "*.tar.gz*" -mtime +$((MONTHLY_RETENTION * 30)) -delete

# Rotation S3/R2
if [[ -n "$S3_BUCKET" ]]; then
    # Daily
    AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
    AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
    aws s3 ls "s3://${S3_BUCKET}/backups/daily/" --endpoint-url "${S3_ENDPOINT}" | \
    while read -r line; do
        createDate=$(echo $line | awk '{print $1" "$2}')
        createDate=$(date -d "$createDate" +%s)
        olderThan=$(date -d "${DAILY_RETENTION} days ago" +%s)
        if [[ $createDate -lt $olderThan ]]; then
            fileName=$(echo $line | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/backups/daily/${fileName}" --endpoint-url "${S3_ENDPOINT}"
        fi
    done
fi

# ================================================================================
# 12. VÉRIFICATION ET RAPPORT
# ================================================================================

log "Verifying backup..."

# Vérification de l'intégrité
if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
    openssl enc -aes-256-cbc -d \
        -in "${DEST_DIR}/${FINAL_BACKUP}" \
        -k "${ENCRYPTION_KEY}" \
        -out /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        log "Backup integrity verified"
        VERIFICATION="PASSED"
    else
        log "ERROR: Backup integrity check failed!"
        VERIFICATION="FAILED"
        notify "ERROR" "Backup integrity check failed for ${FINAL_BACKUP}"
    fi
else
    tar -tzf "${DEST_DIR}/${FINAL_BACKUP}" &>/dev/null
    if [[ $? -eq 0 ]]; then
        log "Backup integrity verified"
        VERIFICATION="PASSED"
    else
        log "ERROR: Backup integrity check failed!"
        VERIFICATION="FAILED"
    fi
fi

# Taille finale
FINAL_SIZE=$(du -h "${DEST_DIR}/${FINAL_BACKUP}" | cut -f1)

# ================================================================================
# 13. NOTIFICATION FINALE
# ================================================================================

DURATION=$((SECONDS / 60))
log "Backup completed in ${DURATION} minutes"

# Message de notification
NOTIFY_MESSAGE="✅ <b>GMAH Backup Completed</b>
📅 Date: $(date)
📦 Type: ${BACKUP_TYPE}
💾 Size: ${FINAL_SIZE}
✔️ Verification: ${VERIFICATION}
⏱️ Duration: ${DURATION} minutes
☁️ Cloud: $(if [[ -n "$S3_BUCKET" ]]; then echo "Uploaded"; else echo "N/A"; fi)"

notify "SUCCESS" "${NOTIFY_MESSAGE}"

# Génération du rapport
cat > "${BACKUP_ROOT}/reports/backup_${TIMESTAMP}.txt" << EOREPORT
================================================================================
GMAH PLATFORM BACKUP REPORT
================================================================================
Timestamp: ${TIMESTAMP}
Type: ${BACKUP_TYPE}
Duration: ${DURATION} minutes
Size: ${FINAL_SIZE}
Verification: ${VERIFICATION}

Databases Backed Up:
$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -lqt | cut -d \| -f 1 | grep gmah)

Files Backed Up:
$(ls -la "${BACKUP_TEMP_DIR}/" 2>/dev/null)

Location: ${DEST_DIR}/${FINAL_BACKUP}
Cloud: $(if [[ -n "$S3_BUCKET" ]]; then echo "s3://${S3_BUCKET}/backups/${BACKUP_TYPE}/${FINAL_BACKUP}"; else echo "N/A"; fi)

================================================================================
EOREPORT

log "Backup report saved to ${BACKUP_ROOT}/reports/backup_${TIMESTAMP}.txt"
EOF
    
    chmod +x "$BACKUP_DIR/scripts/backup-master.sh"
    
    # ================================================================================
    # SCRIPT DE RESTAURATION
    # ================================================================================
    
    cat > "$BACKUP_DIR/scripts/restore-master.sh" << 'EOF'
#!/bin/bash

set -euo pipefail

# Configuration
source /opt/gmah-backup/backup.conf

# Variables
RESTORE_POINT="${1:-latest}"
RESTORE_TYPE="${2:-full}"  # full, database, files, redis
LOG_FILE="${BACKUP_ROOT}/logs/restore-$(date +%Y%m%d_%H%M%S).log"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ================================================================================
# SÉLECTION DU BACKUP À RESTAURER
# ================================================================================

log "Starting GMAH Platform restore..."

if [[ "$RESTORE_POINT" == "latest" ]]; then
    # Trouver le backup le plus récent
    BACKUP_FILE=$(find "${BACKUP_DAILY}" "${BACKUP_WEEKLY}" "${BACKUP_MONTHLY}" \
        -name "*.tar.gz*" -type f -printf '%T@ %p\n' | \
        sort -n | tail -1 | cut -d' ' -f2)
    
    if [[ -z "$BACKUP_FILE" ]]; then
        log "ERROR: No backup found"
        exit 1
    fi
else
    # Utiliser le backup spécifié
    BACKUP_FILE="$RESTORE_POINT"
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log "ERROR: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

log "Restoring from: $BACKUP_FILE"

# ================================================================================
# EXTRACTION DU BACKUP
# ================================================================================

RESTORE_TEMP="${BACKUP_TEMP}/restore-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESTORE_TEMP"

log "Extracting backup..."

# Déchiffrement si nécessaire
if [[ "$BACKUP_FILE" == *.enc ]]; then
    log "Decrypting backup..."
    openssl enc -aes-256-cbc -d \
        -in "$BACKUP_FILE" \
        -out "${RESTORE_TEMP}/backup.tar.gz" \
        -k "${ENCRYPTION_KEY}"
    tar -xzf "${RESTORE_TEMP}/backup.tar.gz" -C "$RESTORE_TEMP"
else
    tar -xzf "$BACKUP_FILE" -C "$RESTORE_TEMP"
fi

# Trouver le répertoire extrait
BACKUP_DIR=$(find "$RESTORE_TEMP" -maxdepth 1 -type d -name "gmah-backup-*" | head -1)

if [[ -z "$BACKUP_DIR" ]]; then
    log "ERROR: Invalid backup structure"
    exit 1
fi

# ================================================================================
# VÉRIFICATION PRÉ-RESTAURATION
# ================================================================================

log "Performing pre-restore checks..."

# Vérifier les checksums
if [[ -f "${BACKUP_DIR}/checksums.sha256" ]]; then
    cd "$BACKUP_DIR"
    if sha256sum -c checksums.sha256 &>/dev/null; then
        log "Checksum verification passed"
    else
        log "WARNING: Checksum verification failed"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    cd - &>/dev/null
fi

# Créer un point de restauration avant modification
if [[ "$RESTORE_TYPE" == "full" || "$RESTORE_TYPE" == "database" ]]; then
    log "Creating restore point..."
    /opt/gmah-backup/scripts/backup-master.sh --quick
fi

# ================================================================================
# RESTAURATION DES BASES DE DONNÉES
# ================================================================================

if [[ "$RESTORE_TYPE" == "full" || "$RESTORE_TYPE" == "database" ]]; then
    log "Restoring PostgreSQL databases..."
    
    # Arrêt des services applicatifs
    systemctl stop pm2-gmah || true
    docker-compose down || true
    
    # Restauration des globals
    if [[ -f "${BACKUP_DIR}/postgres_globals.sql" ]]; then
        log "Restoring PostgreSQL globals..."
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U postgres \
            -f "${BACKUP_DIR}/postgres_globals.sql"
    fi
    
    # Restauration de la base master
    if [[ -f "${BACKUP_DIR}/postgres_gmah_master.dump" ]]; then
        log "Restoring master database..."
        
        # Drop et recréation de la base
        PGPASSWORD="${DB_PASSWORD}" dropdb \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            --if-exists \
            gmah_master
        
        PGPASSWORD="${DB_PASSWORD}" createdb \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            gmah_master
        
        PGPASSWORD="${DB_PASSWORD}" pg_restore \
            -h "${DB_HOST}" \
            -p "${DB_PORT}" \
            -U "${DB_USER}" \
            -d gmah_master \
            --no-owner \
            --no-privileges \
            --verbose \
            "${BACKUP_DIR}/postgres_gmah_master.dump"
    fi
    
    # Restauration des bases tenant
    for dump_file in "${BACKUP_DIR}"/postgres_gmah_org_*.dump; do
        if [[ -f "$dump_file" ]]; then
            db_name=$(basename "$dump_file" .dump | sed 's/postgres_//')
            log "Restoring tenant database: $db_name"
            
            PGPASSWORD="${DB_PASSWORD}" dropdb \
                -h "${DB_HOST}" \
                -p "${DB_PORT}" \
                -U "${DB_USER}" \
                --if-exists \
                "$db_name"
            
            PGPASSWORD="${DB_PASSWORD}" createdb \
                -h "${DB_HOST}" \
                -p "${DB_PORT}" \
                -U "${DB_USER}" \
                "$db_name"
            
            PGPASSWORD="${DB_PASSWORD}" pg_restore \
                -h "${DB_HOST}" \
                -p "${DB_PORT}" \
                -U "${DB_USER}" \
                -d "$db_name" \
                --no-owner \
                --no-privileges \
                "$dump_file"
        fi
    done
fi

# ================================================================================
# RESTAURATION REDIS
# ================================================================================

if [[ "$RESTORE_TYPE" == "full" || "$RESTORE_TYPE" == "redis" ]]; then
    log "Restoring Redis..."
    
    systemctl stop redis-server
    
    if [[ -f "${BACKUP_DIR}/redis_dump.rdb" ]]; then
        cp "${BACKUP_DIR}/redis_dump.rdb" /var/lib/redis/dump.rdb
        chown redis:redis /var/lib/redis/dump.rdb
    fi
    
    if [[ -f "${BACKUP_DIR}/redis_appendonly.aof" ]]; then
        cp "${BACKUP_DIR}/redis_appendonly.aof" /var/lib/redis/appendonly.aof
        chown redis:redis /var/lib/redis/appendonly.aof
    fi
    
    systemctl start redis-server
fi

# ================================================================================
# RESTAURATION DES FICHIERS
# ================================================================================

if [[ "$RESTORE_TYPE" == "full" || "$RESTORE_TYPE" == "files" ]]; then
    log "Restoring application files..."
    
    for archive in "${BACKUP_DIR}"/*.tar.gz; do
        if [[ -f "$archive" && "$archive" != *"docker_"* ]]; then
            log "Extracting: $(basename $archive)"
            tar -xzf "$archive" -C / --overwrite
        fi
    done
fi

# ================================================================================
# RESTAURATION DOCKER
# ================================================================================

if command -v docker &>/dev/null && [[ "$RESTORE_TYPE" == "full" ]]; then
    log "Restoring Docker containers..."
    
    # Restauration des images
    for image_file in "${BACKUP_DIR}"/docker_*.tar; do
        if [[ -f "$image_file" ]]; then
            log "Loading Docker image: $(basename $image_file)"
            docker load < "$image_file"
        fi
    done
    
    # Restauration des volumes
    for volume_archive in "${BACKUP_DIR}"/docker_volume_*.tar.gz; do
        if [[ -f "$volume_archive" ]]; then
            volume_name=$(basename "$volume_archive" .tar.gz | sed 's/docker_volume_//')
            log "Restoring Docker volume: $volume_name"
            
            docker volume create "$volume_name" || true
            docker run --rm -v "$volume_name":/data -v "$BACKUP_DIR":/backup \
                alpine tar -xzf "/backup/$(basename $volume_archive)" -C /data
        fi
    done
    
    # Restauration de docker-compose.yml
    if [[ -f "${BACKUP_DIR}/docker-compose.yml" ]]; then
        cp "${BACKUP_DIR}/docker-compose.yml" /home/gmah/gmah-platform/
        cp "${BACKUP_DIR}"/.env* /home/gmah/gmah-platform/ 2>/dev/null || true
    fi
fi

# ================================================================================
# POST-RESTAURATION
# ================================================================================

log "Running post-restore tasks..."

# Redémarrage des services
systemctl restart postgresql || true
systemctl restart redis-server || true
systemctl restart nginx || true
pm2 resurrect || true
docker-compose up -d || true

# Vérification des services
sleep 10

SERVICES_OK=true
for service in postgresql redis-server nginx; do
    if ! systemctl is-active --quiet $service; then
        log "ERROR: Service $service is not running"
        SERVICES_OK=false
    fi
done

# Tests de santé
if curl -f http://localhost:3333/health &>/dev/null; then
    log "API health check: OK"
else
    log "WARNING: API health check failed"
    SERVICES_OK=false
fi

# ================================================================================
# RAPPORT DE RESTAURATION
# ================================================================================

if $SERVICES_OK; then
    log "Restore completed successfully!"
    STATUS="SUCCESS"
else
    log "Restore completed with warnings"
    STATUS="WARNING"
fi

# Notification
notify() {
    if [[ -n "$NOTIFY_EMAIL" ]]; then
        echo "$1" | mail -s "GMAH Restore $STATUS" "$NOTIFY_EMAIL"
    fi
    
    if [[ -n "$NOTIFY_TELEGRAM" && -n "$TELEGRAM_TOKEN" ]]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -d chat_id="${NOTIFY_TELEGRAM}" \
            -d text="🔄 GMAH Restore ${STATUS}: $1" \
            -d parse_mode="HTML"
    fi
}

notify "Restore from ${BACKUP_FILE} completed with status: ${STATUS}"

# Nettoyage
rm -rf "$RESTORE_TEMP"

log "Restore process completed"
EOF
    
    chmod +x "$BACKUP_DIR/scripts/restore-master.sh"
    
    # ================================================================================
    # SCRIPT DE TEST DE RESTAURATION
    # ================================================================================
    
    cat > "$BACKUP_DIR/scripts/test-restore.sh" << 'EOF'
#!/bin/bash

# Script de test de restauration en environnement isolé

set -euo pipefail

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting restore test..."

# Création d'un environnement de test isolé
TEST_ENV="/opt/gmah-restore-test"
mkdir -p "$TEST_ENV"

# Test avec Docker
docker run -d \
    --name gmah-restore-test-db \
    -e POSTGRES_PASSWORD=testpass \
    -e POSTGRES_USER=testuser \
    -e POSTGRES_DB=testdb \
    -p 15432:5432 \
    postgres:15-alpine

sleep 10

# Test de restauration dans l'environnement isolé
BACKUP_FILE=$(find /opt/gmah-backup -name "*.tar.gz*" -type f | head -1)

if [[ -n "$BACKUP_FILE" ]]; then
    log "Testing restore with: $BACKUP_FILE"
    
    # Extraction et test
    tar -xzf "$BACKUP_FILE" -C "$TEST_ENV" 2>/dev/null || \
    openssl enc -aes-256-cbc -d -in "$BACKUP_FILE" -k "${ENCRYPTION_KEY}" | tar -xz -C "$TEST_ENV"
    
    # Vérification
    if [[ -d "$TEST_ENV"/gmah-backup-* ]]; then
        log "Restore test: PASSED"
        echo "✅ Backup is restorable"
    else
        log "Restore test: FAILED"
        echo "❌ Backup cannot be restored"
    fi
else
    log "No backup found for testing"
fi

# Nettoyage
docker stop gmah-restore-test-db
docker rm gmah-restore-test-db
rm -rf "$TEST_ENV"

log "Restore test completed"
EOF
    
    chmod +x "$BACKUP_DIR/scripts/test-restore.sh"
    
    # ================================================================================
    # CONFIGURATION CRON
    # ================================================================================
    
    cat > /etc/cron.d/gmah-backup << EOF
# GMAH Platform Backup Schedule
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily backup at 2:00 AM
0 2 * * * root /opt/gmah-backup/scripts/backup-master.sh >> /opt/gmah-backup/logs/cron.log 2>&1

# Weekly restore test on Sunday at 4:00 AM
0 4 * * 0 root /opt/gmah-backup/scripts/test-restore.sh >> /opt/gmah-backup/logs/test.log 2>&1

# Cleanup old logs monthly
0 0 1 * * root find /opt/gmah-backup/logs -name "*.log" -mtime +90 -delete
EOF
    
    # Service systemd pour backup
    cat > /etc/systemd/system/gmah-backup.service << EOF
[Unit]
Description=GMAH Platform Backup Service
After=network.target postgresql.service redis.service

[Service]
Type=oneshot
ExecStart=/opt/gmah-backup/scripts/backup-master.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    cat > /etc/systemd/system/gmah-backup.timer << EOF
[Unit]
Description=GMAH Platform Daily Backup
Requires=gmah-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    systemctl daemon-reload
    systemctl enable gmah-backup.timer
    systemctl start gmah-backup.timer
    
    log SUCCESS "Advanced backup system configured"
}

# Export des fonctions
export -f setup_advanced_backup