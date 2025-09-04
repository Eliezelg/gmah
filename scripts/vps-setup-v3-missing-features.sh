#!/bin/bash

# ================================================================================
# FONCTIONNALITÉS MANQUANTES DE V2 → V3
# ================================================================================

# ================================================================================
# CONFIGURATION POSTFIX POUR EMAILS
# ================================================================================

setup_postfix_mail() {
    log INFO "Configuration de Postfix pour l'envoi d'emails..."
    
    # Installation
    debconf-set-selections <<< "postfix postfix/mailname string ${DOMAIN}"
    debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
    apt-get install -y postfix mailutils libsasl2-2 ca-certificates libsasl2-modules
    
    # Configuration Postfix sécurisée
    cat > /etc/postfix/main.cf << EOF
# GMAH Platform Postfix Configuration
smtpd_banner = \$myhostname ESMTP
biff = no
append_dot_mydomain = no
readme_directory = no
compatibility_level = 2

# TLS parameters
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls=yes
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache
smtp_tls_security_level = may
smtpd_tls_security_level = may
smtp_tls_note_starttls_offer = yes
smtpd_tls_received_header = yes
smtpd_tls_loglevel = 1

# Network
myhostname = ${DOMAIN}
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
myorigin = /etc/mailname
mydestination = \$myhostname, localhost.\$mydomain, localhost, ${DOMAIN}
relayhost = 
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = loopback-only
inet_protocols = all

# Security
smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination
smtpd_recipient_restrictions = 
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination,
    reject_rbl_client zen.spamhaus.org,
    reject_rbl_client bl.spamcop.net

# Rate limiting
smtpd_client_connection_rate_limit = 10
smtpd_client_connection_count_limit = 10
anvil_rate_time_unit = 60s

# SASL
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
broken_sasl_auth_clients = yes

# Milter
milter_protocol = 2
milter_default_action = accept
smtpd_milters = local:/opendkim/opendkim.sock
non_smtpd_milters = local:/opendkim/opendkim.sock
EOF
    
    # Configuration pour Gmail relay (optionnel)
    if [[ -n "${GMAIL_USER}" && -n "${GMAIL_PASSWORD}" ]]; then
        cat >> /etc/postfix/main.cf << EOF

# Gmail Relay
relayhost = [smtp.gmail.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_CAfile = /etc/postfix/cacert.pem
smtp_use_tls = yes
EOF
        
        # Credentials Gmail
        echo "[smtp.gmail.com]:587 ${GMAIL_USER}:${GMAIL_PASSWORD}" > /etc/postfix/sasl_passwd
        chmod 600 /etc/postfix/sasl_passwd
        postmap /etc/postfix/sasl_passwd
        
        # Certificats CA
        cat /etc/ssl/certs/ca-certificates.crt > /etc/postfix/cacert.pem
    fi
    
    # DKIM pour authentification des emails
    apt-get install -y opendkim opendkim-tools
    
    # Configuration OpenDKIM
    cat > /etc/opendkim.conf << EOF
AutoRestart             Yes
AutoRestartRate         10/1h
UMask                   002
Syslog                  yes
SyslogSuccess           Yes
LogWhy                  Yes
Canonicalization        relaxed/simple
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
KeyTable                refile:/etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
Mode                    sv
PidFile                 /var/run/opendkim/opendkim.pid
SignatureAlgorithm      rsa-sha256
UserID                  opendkim:opendkim
Socket                  local:/var/spool/postfix/opendkim/opendkim.sock
EOF
    
    # Génération clés DKIM
    mkdir -p /etc/opendkim/keys/${DOMAIN}
    opendkim-genkey -s default -d ${DOMAIN} -D /etc/opendkim/keys/${DOMAIN}
    chown opendkim:opendkim /etc/opendkim/keys/${DOMAIN}/default.private
    
    # Tables DKIM
    echo "default._domainkey.${DOMAIN} ${DOMAIN}:default:/etc/opendkim/keys/${DOMAIN}/default.private" > /etc/opendkim/KeyTable
    echo "*@${DOMAIN} default._domainkey.${DOMAIN}" > /etc/opendkim/SigningTable
    echo -e "127.0.0.1\nlocalhost\n${DOMAIN}" > /etc/opendkim/TrustedHosts
    
    # SPF Record
    echo "@ IN TXT \"v=spf1 a mx ip4:$(curl -s ifconfig.me) ~all\"" > /tmp/spf_record.txt
    
    # DMARC Record
    echo "_dmarc IN TXT \"v=DMARC1; p=quarantine; rua=mailto:dmarc@${DOMAIN}\"" > /tmp/dmarc_record.txt
    
    systemctl restart postfix opendkim
    
    # Test email
    echo "Test email from GMAH Platform" | mail -s "GMAH Setup Test" ${ADMIN_EMAIL}
    
    log SUCCESS "Postfix configuré avec DKIM/SPF/DMARC"
}

# ================================================================================
# LYNIS SECURITY AUDIT
# ================================================================================

setup_lynis_audit() {
    log INFO "Installation de Lynis pour audit de sécurité..."
    
    # Installation
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys C80E383C3DE9F082E01391A0366C67DE91CA5D5F
    echo "deb https://packages.cisofy.com/community/lynis/deb/ stable main" > /etc/apt/sources.list.d/cisofy-lynis.list
    apt-get update
    apt-get install -y lynis
    
    # Configuration audit automatique
    cat > /etc/lynis/custom.prf << 'EOF'
# GMAH Platform Lynis Profile

# Skip tests
skip-test=AUTH-9262
skip-test=FILE-6310

# Configuration
config:update_check_directory:/tmp
config:upload_server:portal.cisofy.com

# Custom settings
hardening-level=high
compliance-standard=cis
show-warnings-only=no
show-report-solution=yes
upload=no
verbose=no

# Plugins
plugin=audit
plugin=filesystem
plugin=networking
EOF
    
    # Script d'audit hebdomadaire
    cat > /etc/cron.weekly/lynis-audit << 'EOF'
#!/bin/bash

REPORT_FILE="/var/log/lynis-report-$(date +%Y%m%d).log"
EMAIL="${ADMIN_EMAIL}"

# Run Lynis audit
lynis audit system --profile /etc/lynis/custom.prf > "$REPORT_FILE" 2>&1

# Extract score
SCORE=$(grep "Hardening index" "$REPORT_FILE" | awk '{print $4}')

# Send report if score is low
if [[ ${SCORE%\%} -lt 80 ]]; then
    mail -s "Lynis Security Audit - Score: $SCORE" "$EMAIL" < "$REPORT_FILE"
fi

# Archive old reports
find /var/log -name "lynis-report-*.log" -mtime +30 -delete
EOF
    
    chmod +x /etc/cron.weekly/lynis-audit
    
    # Premier audit
    lynis audit system --quick
    
    log SUCCESS "Lynis configuré pour audits hebdomadaires"
}

# ================================================================================
# AIDE INTRUSION DETECTION (SCHEDULE)
# ================================================================================

setup_aide_schedule() {
    log INFO "Configuration AIDE avec vérification quotidienne..."
    
    # Installation si pas déjà fait
    apt-get install -y aide aide-common
    
    # Configuration AIDE étendue
    cat >> /etc/aide/aide.conf << 'EOF'

# GMAH Custom Rules
/home/gmah/gmah-platform/dist R+b+s+m+c+md5+sha256
/home/gmah/gmah-platform/apps/*/src R+b+s+m+c+md5+sha256
/etc/gmah R+b+s+m+c+md5+sha256
/var/www R+b+s+m+c+md5+sha256

# Exclusions
!/home/gmah/logs/
!/home/gmah/uploads/
!/var/log/
!/tmp/
!/proc/
!/sys/
EOF
    
    # Initialisation de la base
    aideinit -y -f
    
    # Script de vérification quotidienne
    cat > /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash

AIDE_CONFIG="/etc/aide/aide.conf"
REPORT_FILE="/var/log/aide/aide-report-$(date +%Y%m%d).log"
EMAIL="${ADMIN_EMAIL}"

# Run AIDE check
/usr/bin/aide --config="$AIDE_CONFIG" --check > "$REPORT_FILE" 2>&1

# Check if changes detected
if grep -q "changed" "$REPORT_FILE"; then
    # Send alert
    echo "AIDE has detected file changes on $(hostname)" | \
    mail -s "🔴 AIDE Alert - File Changes Detected" "$EMAIL" -A "$REPORT_FILE"
    
    # Update database after review
    read -t 86400 -p "Update AIDE database? (y/n): " UPDATE
    if [[ "$UPDATE" == "y" ]]; then
        aide --config="$AIDE_CONFIG" --init
        mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
    fi
fi

# Rotate logs
find /var/log/aide -name "aide-report-*.log" -mtime +30 -delete
EOF
    
    chmod +x /etc/cron.daily/aide-check
    
    log SUCCESS "AIDE configuré avec vérification quotidienne"
}

# ================================================================================
# APPARMOR PROFILES
# ================================================================================

setup_apparmor_profiles() {
    log INFO "Configuration des profils AppArmor..."
    
    # Installation
    apt-get install -y apparmor apparmor-utils apparmor-profiles apparmor-profiles-extra
    
    # Profil pour Node.js/PM2
    cat > /etc/apparmor.d/gmah.nodejs << 'EOF'
#include <tunables/global>

/usr/bin/node {
  #include <abstractions/base>
  #include <abstractions/node>
  
  capability setuid,
  capability setgid,
  capability dac_override,
  
  /usr/bin/node ix,
  /home/gmah/gmah-platform/** r,
  /home/gmah/gmah-platform/dist/** rx,
  /home/gmah/gmah-platform/node_modules/** r,
  /home/gmah/logs/** rw,
  /home/gmah/uploads/** rw,
  
  /proc/sys/kernel/random/uuid r,
  /dev/urandom r,
  
  network inet stream,
  network inet dgram,
  network inet6 stream,
  network inet6 dgram,
  
  deny /etc/shadow r,
  deny /etc/gshadow r,
  deny /root/** rwx,
}
EOF
    
    # Profil pour Nginx
    cat > /etc/apparmor.d/gmah.nginx << 'EOF'
#include <tunables/global>

/usr/sbin/nginx {
  #include <abstractions/base>
  #include <abstractions/nginx>
  
  capability net_bind_service,
  capability dac_override,
  capability setuid,
  capability setgid,
  
  /usr/sbin/nginx mr,
  /etc/nginx/** r,
  /var/log/nginx/** rw,
  /var/lib/nginx/** rw,
  /run/nginx.pid rw,
  
  /home/gmah/gmah-platform/apps/web/public/** r,
  /home/gmah/gmah-platform/apps/web/.next/** r,
  /home/gmah/uploads/** r,
  
  network inet stream,
  network inet6 stream,
}
EOF
    
    # Chargement des profils
    apparmor_parser -r /etc/apparmor.d/gmah.*
    
    # Activation enforcement mode
    aa-enforce /usr/bin/node
    aa-enforce /usr/sbin/nginx
    aa-enforce /usr/sbin/mysqld 2>/dev/null || true
    
    # Status
    aa-status
    
    log SUCCESS "Profils AppArmor configurés et activés"
}

# ================================================================================
# PM2 STARTUP & CONFIGURATION AVANCÉE
# ================================================================================

setup_pm2_startup() {
    log INFO "Configuration PM2 startup et monitoring..."
    
    # Génération startup script
    pm2 startup systemd -u ${SYSTEM_USER} --hp /home/${SYSTEM_USER}
    
    # Configuration PM2
    pm2 install pm2-auto-pull
    pm2 install pm2-server-monit
    pm2 install pm2-health
    
    # Configuration metrics
    pm2 set pm2:sysmonit true
    pm2 set pm2-health:smtp-host localhost
    pm2 set pm2-health:smtp-port 25
    pm2 set pm2-health:mail-from "pm2@${DOMAIN}"
    pm2 set pm2-health:mail-to "${ADMIN_EMAIL}"
    
    # Configuration log rotation étendue
    pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
    pm2 set pm2-logrotate:max_size 100M
    pm2 set pm2-logrotate:retain 30
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
    pm2 set pm2-logrotate:workerInterval 30
    pm2 set pm2-logrotate:rotateModule true
    
    # Configuration déploiement GitHub
    cat >> /home/${SYSTEM_USER}/gmah-platform/ecosystem.config.js << 'EOF'

  // Deployment configuration
  deploy: {
    production: {
      user: '${SYSTEM_USER}',
      host: '${DOMAIN}',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/gmah-platform.git',
      path: '/home/${SYSTEM_USER}/gmah-platform',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: '${SYSTEM_USER}',
      host: 'staging.${DOMAIN}',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/gmah-platform.git',
      path: '/home/${SYSTEM_USER}/gmah-platform-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
EOF
    
    # Webhook pour auto-deploy
    cat > /home/${SYSTEM_USER}/scripts/github-webhook.js << 'EOF'
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-secret';
const PORT = 9999;

function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const calculatedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const signature = req.headers['x-hub-signature-256'];
      
      if (!signature || !verifySignature(body, signature)) {
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      
      const payload = JSON.parse(body);
      
      if (payload.ref === 'refs/heads/main') {
        exec('pm2 deploy production', (error, stdout, stderr) => {
          if (error) {
            console.error('Deploy error:', error);
          } else {
            console.log('Deploy success:', stdout);
          }
        });
      }
      
      res.writeHead(200);
      res.end('OK');
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(PORT);

console.log(`GitHub webhook listening on port ${PORT}`);
EOF
    
    # PM2 save
    pm2 save
    
    log SUCCESS "PM2 startup configuré avec auto-deploy"
}

# ================================================================================
# TELEGRAF METRICS COLLECTOR
# ================================================================================

setup_telegraf() {
    log INFO "Installation de Telegraf pour collecte de métriques..."
    
    # Installation
    wget -qO- https://repos.influxdata.com/influxdb.key | apt-key add -
    echo "deb https://repos.influxdata.com/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/influxdb.list
    apt-get update
    apt-get install -y telegraf
    
    # Configuration Telegraf
    cat > /etc/telegraf/telegraf.d/gmah.conf << 'EOF'
[global_tags]
  environment = "production"
  project = "gmah-platform"
  
[agent]
  interval = "10s"
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  collection_jitter = "0s"
  flush_interval = "10s"
  flush_jitter = "0s"
  precision = ""
  hostname = "${DOMAIN}"
  omit_hostname = false

# Outputs
[[outputs.prometheus_client]]
  listen = ":9273"
  metric_version = 2
  expiration_interval = "60s"

[[outputs.file]]
  files = ["/var/log/telegraf/metrics.log"]
  rotation_interval = "24h"
  rotation_max_size = "100MB"
  rotation_max_archives = 7

# Inputs
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]

[[inputs.diskio]]

[[inputs.kernel]]

[[inputs.mem]]

[[inputs.processes]]

[[inputs.swap]]

[[inputs.system]]

[[inputs.net]]
  interfaces = ["eth*", "enp*"]
  ignore_protocol_stats = false

[[inputs.netstat]]

[[inputs.nginx]]
  urls = ["http://localhost/nginx_status"]

[[inputs.postgresql_extensible]]
  address = "host=localhost user=${DB_USER} password=${DB_PASSWORD} sslmode=disable dbname=gmah_master"
  databases = ["gmah_master"]

[[inputs.redis]]
  servers = ["tcp://:${REDIS_PASSWORD}@localhost:6379"]

[[inputs.procstat]]
  pattern = "node"
  user = "${SYSTEM_USER}"

[[inputs.docker]]
  endpoint = "unix:///var/run/docker.sock"
  gather_services = true
  container_names = []
  source_tag = false
  container_name_include = ["gmah*"]
  container_state_include = ["created", "restarting", "running", "paused", "exited"]
  timeout = "5s"
  docker_label_include = ["com.gmah.*"]

[[inputs.http_response]]
  address = "https://${DOMAIN}"
  response_timeout = "5s"
  method = "GET"
  follow_redirects = false
  response_string_match = ""
  insecure_skip_verify = false

[[inputs.x509_cert]]
  sources = ["https://${DOMAIN}:443"]
  timeout = "5s"
EOF
    
    systemctl enable telegraf
    systemctl restart telegraf
    
    log SUCCESS "Telegraf configuré pour collecte de métriques"
}

# ================================================================================
# CONFIGURATION WORKER PM2
# ================================================================================

setup_pm2_workers() {
    log INFO "Configuration des workers PM2..."
    
    # Ajout de la configuration worker dans ecosystem.config.js
    cat >> /home/${SYSTEM_USER}/gmah-platform/ecosystem.config.js << 'EOF'
    
    // Background Workers
    {
      name: 'gmah-worker-emails',
      script: 'dist/apps/worker/email-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'email'
      },
      error_file: '/home/gmah/logs/worker-email-error.log',
      out_file: '/home/gmah/logs/worker-email-out.log',
      time: true
    },
    {
      name: 'gmah-worker-scheduler',
      script: 'dist/apps/worker/scheduler.js',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 */6 * * *',
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'scheduler'
      },
      error_file: '/home/gmah/logs/scheduler-error.log',
      out_file: '/home/gmah/logs/scheduler-out.log',
      time: true
    },
    {
      name: 'gmah-worker-backup',
      script: '/home/gmah/scripts/backup-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 2 * * *',
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'backup'
      },
      error_file: '/home/gmah/logs/backup-worker-error.log',
      out_file: '/home/gmah/logs/backup-worker-out.log',
      time: true
    },
    {
      name: 'gmah-queue-processor',
      script: 'dist/apps/worker/queue-processor.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'queue',
        REDIS_URL: 'redis://:${REDIS_PASSWORD}@localhost:6379'
      },
      error_file: '/home/gmah/logs/queue-error.log',
      out_file: '/home/gmah/logs/queue-out.log',
      time: true
    }
EOF
    
    log SUCCESS "Workers PM2 configurés"
}

# ================================================================================
# EXPORT DES FONCTIONS
# ================================================================================

export -f setup_postfix_mail
export -f setup_lynis_audit
export -f setup_aide_schedule
export -f setup_apparmor_profiles
export -f setup_pm2_startup
export -f setup_telegraf
export -f setup_pm2_workers