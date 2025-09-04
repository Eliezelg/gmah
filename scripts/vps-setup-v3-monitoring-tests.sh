#!/bin/bash

# ================================================================================
# MONITORING AVANCÉ & TESTS AUTOMATIQUES
# ================================================================================

# ================================================================================
# STACK DE MONITORING COMPLET (ELK + Prometheus + Grafana)
# ================================================================================

setup_advanced_monitoring() {
    log INFO "Installation du stack de monitoring avancé..."
    
    local MONITORING_DIR="/opt/gmah-monitoring"
    mkdir -p "$MONITORING_DIR"/{prometheus,grafana,alertmanager,elasticsearch,logstash,filebeat,metricbeat}
    
    # ================================================================================
    # PROMETHEUS - Métriques
    # ================================================================================
    
    log INFO "Configuration de Prometheus..."
    
    # Installation Prometheus
    PROMETHEUS_VERSION="2.48.0"
    wget -q https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
    tar -xzf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
    mv prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus /usr/local/bin/
    mv prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool /usr/local/bin/
    rm -rf prometheus-${PROMETHEUS_VERSION}.linux-amd64*
    
    # Configuration Prometheus avec découverte automatique
    cat > "$MONITORING_DIR/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'gmah-platform'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

# Load rules
rule_files:
  - "rules/*.yml"

# Scrape configurations
scrape_configs:
  # Node Exporter - Métriques système
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'gmah-server'

  # PostgreSQL Exporter
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
    params:
      auth_module: [gmah]

  # Redis Exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  # Nginx Exporter
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  # Docker containers
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

  # Application metrics (PM2)
  - job_name: 'pm2'
    static_configs:
      - targets: ['localhost:9209']

  # Blackbox Exporter - Probes externes
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://gmah.com
          - https://api.gmah.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9115

  # Service Discovery pour Kubernetes
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
EOF
    
    # Règles d'alerting sophistiquées
    mkdir -p "$MONITORING_DIR/prometheus/rules"
    cat > "$MONITORING_DIR/prometheus/rules/gmah_alerts.yml" << 'EOF'
groups:
  - name: gmah_critical
    interval: 30s
    rules:
      # CPU Alert
      - alert: HighCPUUsage
        expr: (100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
        for: 5m
        labels:
          severity: critical
          team: devops
        annotations:
          summary: "CPU usage is critically high on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"
          runbook_url: "https://docs.gmah.com/runbooks/high-cpu"

      # Memory Alert
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memory usage is critically high on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      # Disk Alert
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100) < 15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space is critically low on {{ $labels.instance }}"
          description: "Only {{ $value }}% disk space left on {{ $labels.instance }}"

      # Database Connection Pool
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool is nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections are in use"

      # Redis Memory
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage is high"
          description: "Redis is using {{ $value | humanizePercentage }} of max memory"

      # API Response Time
      - alert: APIResponseTimeSlow
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time is slow"
          description: "95th percentile response time is {{ $value }}s"

      # Service Down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      # SSL Certificate Expiry
      - alert: SSLCertificateExpiringSoon
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate for {{ $labels.instance }} expires in {{ $value | humanizeDuration }}"

      # Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.instance }}"

      # Database Slow Queries
      - alert: DatabaseSlowQueries
        expr: rate(pg_stat_statements_mean_exec_time_seconds[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database queries are slow"
          description: "Average query execution time is {{ $value }}s"
EOF
    
    # Service Prometheus
    cat > /etc/systemd/system/prometheus.service << EOF
[Unit]
Description=Prometheus Monitoring System
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/prometheus \
    --config.file=$MONITORING_DIR/prometheus/prometheus.yml \
    --storage.tsdb.path=$MONITORING_DIR/prometheus/data \
    --storage.tsdb.retention.time=30d \
    --web.console.libraries=/usr/share/prometheus/console_libraries \
    --web.console.templates=/usr/share/prometheus/consoles \
    --web.enable-lifecycle \
    --web.enable-admin-api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    # ================================================================================
    # GRAFANA - Dashboards
    # ================================================================================
    
    log INFO "Configuration de Grafana..."
    
    # Installation Grafana
    apt-get install -y software-properties-common
    add-apt-repository -y "deb https://packages.grafana.com/oss/deb stable main"
    wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
    apt-get update
    apt-get install -y grafana
    
    # Configuration Grafana
    cat > /etc/grafana/grafana.ini << 'EOF'
[server]
protocol = http
http_port = 3001
domain = grafana.gmah.com
root_url = %(protocol)s://%(domain)s:%(http_port)s/
serve_from_sub_path = false

[database]
type = sqlite3
path = grafana.db

[security]
admin_user = admin
admin_password = ${GRAFANA_PASSWORD}
secret_key = ${GRAFANA_SECRET_KEY}
disable_gravatar = true
cookie_secure = true
cookie_samesite = strict
strict_transport_security = true
strict_transport_security_max_age_seconds = 86400
strict_transport_security_preload = true
strict_transport_security_subdomains = true
x_content_type_options = true
x_xss_protection = true

[users]
allow_sign_up = false
allow_org_create = false
auto_assign_org = true
auto_assign_org_role = Viewer

[auth]
disable_login_form = false
oauth_auto_login = false

[auth.anonymous]
enabled = false

[alerting]
enabled = true
execute_alerts = true

[analytics]
reporting_enabled = false
check_for_updates = false

[log]
mode = console file
level = info
filters = rendering:debug

[metrics]
enabled = true
interval_seconds = 10

[snapshots]
external_enabled = false

[dashboards]
versions_to_keep = 20

[smtp]
enabled = true
host = localhost:25
user = 
password = 
cert_file = 
key_file = 
skip_verify = true
from_address = grafana@gmah.com
from_name = Grafana GMAH
EOF
    
    # Provisioning automatique des dashboards
    mkdir -p /etc/grafana/provisioning/{dashboards,datasources,notifiers}
    
    # Datasources
    cat > /etc/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: false
    
  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://localhost:9200
    database: "[logstash-]YYYY.MM.DD"
    jsonData:
      esVersion: "8.11.0"
      timeField: "@timestamp"
      
  - name: Redis
    type: redis-datasource
    access: proxy
    url: redis://localhost:6379
    secureJsonData:
      password: ${REDIS_PASSWORD}
      
  - name: PostgreSQL
    type: postgres
    url: localhost:5432
    database: gmah_master
    user: gmah
    secureJsonData:
      password: ${DB_PASSWORD}
    jsonData:
      sslmode: require
      postgresVersion: 1500
EOF
    
    # Dashboard personnalisé GMAH
    cat > /etc/grafana/provisioning/dashboards/gmah-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "GMAH Platform Monitoring",
    "tags": ["gmah", "production"],
    "timezone": "browser",
    "panels": [
      {
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{ instance }}",
            "refId": "A"
          }
        ]
      },
      {
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory %",
            "refId": "A"
          }
        ]
      },
      {
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "id": 3,
        "title": "API Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95",
            "refId": "A"
          }
        ]
      },
      {
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "id": 4,
        "title": "Active Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Connections",
            "refId": "A"
          }
        ]
      }
    ]
  }
}
EOF
    
    # ================================================================================
    # ELK STACK - Logs
    # ================================================================================
    
    log INFO "Configuration de l'ELK Stack..."
    
    # Elasticsearch
    wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | apt-key add -
    echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" > /etc/apt/sources.list.d/elastic-8.x.list
    apt-get update
    apt-get install -y elasticsearch
    
    # Configuration Elasticsearch optimisée
    cat > /etc/elasticsearch/elasticsearch.yml << 'EOF'
cluster.name: gmah-cluster
node.name: gmah-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 127.0.0.1
http.port: 9200
discovery.type: single-node
xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.client_authentication: required
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
indices.query.bool.max_clause_count: 4096
EOF
    
    # Logstash
    apt-get install -y logstash
    
    # Pipeline Logstash pour GMAH
    cat > /etc/logstash/conf.d/gmah-pipeline.conf << 'EOF'
input {
  # Logs Nginx
  file {
    path => "/var/log/nginx/*.log"
    start_position => "beginning"
    type => "nginx"
    codec => "json"
  }
  
  # Logs Application
  file {
    path => "/home/gmah/logs/*.log"
    start_position => "beginning"
    type => "application"
    codec => "json"
  }
  
  # Logs PostgreSQL
  file {
    path => "/var/log/postgresql/*.log"
    start_position => "beginning"
    type => "postgresql"
    codec => multiline {
      pattern => "^%{TIMESTAMP_ISO8601}"
      negate => true
      what => "previous"
    }
  }
  
  # Logs Docker
  docker {
    endpoint => "unix:///var/run/docker.sock"
    type => "docker"
  }
  
  # Métriques système via Syslog
  syslog {
    port => 5514
    type => "syslog"
  }
  
  # Beats input
  beats {
    port => 5044
    ssl => true
    ssl_certificate => "/etc/logstash/ssl/logstash.crt"
    ssl_key => "/etc/logstash/ssl/logstash.key"
  }
}

filter {
  # Parsing des logs Nginx
  if [type] == "nginx" {
    grok {
      match => {
        "message" => '%{IPORHOST:remote_addr} - %{DATA:remote_user} \[%{HTTPDATE:time_local}\] "%{WORD:method} %{DATA:request} HTTP/%{NUMBER:http_version}" %{NUMBER:status} %{NUMBER:body_bytes_sent} "%{DATA:http_referer}" "%{DATA:http_user_agent}"'
      }
    }
    
    date {
      match => ["time_local", "dd/MMM/yyyy:HH:mm:ss Z"]
    }
    
    geoip {
      source => "remote_addr"
      target => "geoip"
    }
    
    useragent {
      source => "http_user_agent"
      target => "user_agent"
    }
  }
  
  # Parsing des logs PostgreSQL
  if [type] == "postgresql" {
    grok {
      match => {
        "message" => "%{TIMESTAMP_ISO8601:timestamp} \[%{NUMBER:pid}\]: \[%{NUMBER:session_line}\] user=%{DATA:user},db=%{DATA:database},app=%{DATA:application},client=%{IPORHOST:client} %{GREEDYDATA:query_message}"
      }
    }
    
    date {
      match => ["timestamp", "ISO8601"]
    }
  }
  
  # Parsing des logs Application
  if [type] == "application" {
    json {
      source => "message"
    }
    
    date {
      match => ["timestamp", "ISO8601"]
    }
  }
  
  # Enrichissement des données
  mutate {
    add_field => {
      "environment" => "production"
      "service" => "gmah-platform"
    }
  }
  
  # Détection d'anomalies
  if [status] {
    if [status] >= 500 {
      mutate {
        add_tag => ["error", "5xx"]
        add_field => {"alert" => "critical"}
      }
    } else if [status] >= 400 {
      mutate {
        add_tag => ["error", "4xx"]
        add_field => {"alert" => "warning"}
      }
    }
  }
  
  # Analyse des performances
  if [request_time] {
    if [request_time] > 1.0 {
      mutate {
        add_tag => ["slow_request"]
        add_field => {"performance_issue" => "true"}
      }
    }
  }
}

output {
  # Output vers Elasticsearch
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "gmah-%{type}-%{+YYYY.MM.dd}"
    template_name => "gmah"
    template => "/etc/logstash/templates/gmah-template.json"
    template_overwrite => true
    user => "elastic"
    password => "${ELASTIC_PASSWORD}"
    ssl => true
    ssl_certificate_verification => true
    cacert => "/etc/logstash/ssl/ca.crt"
  }
  
  # Output vers stdout pour debug (désactiver en production)
  # stdout { codec => rubydebug }
  
  # Alerting pour erreurs critiques
  if [alert] == "critical" {
    email {
      to => "admin@gmah.com"
      subject => "GMAH Platform Critical Alert"
      body => "Critical error detected:\n\nMessage: %{message}\nStatus: %{status}\nTimestamp: %{@timestamp}"
      from => "alerts@gmah.com"
    }
    
    webhook {
      url => "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      format => "json"
      mapping => {
        "text" => "🚨 Critical Alert: %{message}"
        "channel" => "#alerts"
      }
    }
  }
}
EOF
    
    # Filebeat pour collecte de logs
    apt-get install -y filebeat
    
    cat > /etc/filebeat/filebeat.yml << 'EOF'
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/nginx/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: nginx
      
  - type: log
    enabled: true
    paths:
      - /home/gmah/logs/*.log
    json.keys_under_root: true
    fields:
      service: application
      
  - type: docker
    enabled: true
    containers.ids:
      - "*"
    fields:
      service: docker

processors:
  - add_host_metadata:
      when.not.contains:
        tags: forwarded
  - add_docker_metadata: ~
  - add_kubernetes_metadata: ~

output.logstash:
  hosts: ["localhost:5044"]
  ssl.enabled: true
  ssl.certificate: "/etc/filebeat/ssl/filebeat.crt"
  ssl.key: "/etc/filebeat/ssl/filebeat.key"

monitoring.enabled: true
monitoring.elasticsearch:
  hosts: ["localhost:9200"]
EOF
    
    # ================================================================================
    # ALERTMANAGER - Gestion des alertes
    # ================================================================================
    
    log INFO "Configuration d'Alertmanager..."
    
    ALERTMANAGER_VERSION="0.26.0"
    wget -q https://github.com/prometheus/alertmanager/releases/download/v${ALERTMANAGER_VERSION}/alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz
    tar -xzf alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz
    mv alertmanager-${ALERTMANAGER_VERSION}.linux-amd64/alertmanager /usr/local/bin/
    mv alertmanager-${ALERTMANAGER_VERSION}.linux-amd64/amtool /usr/local/bin/
    rm -rf alertmanager-${ALERTMANAGER_VERSION}.linux-amd64*
    
    # Configuration Alertmanager
    cat > "$MONITORING_DIR/alertmanager/alertmanager.yml" << 'EOF'
global:
  resolve_timeout: 5m
  smtp_from: 'alerts@gmah.com'
  smtp_smarthost: 'localhost:25'
  smtp_require_tls: false

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'gmah-team'
  
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true
      
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 12h
      
    - match_re:
        service: ^(postgresql|redis)$
      receiver: 'database-team'
      
    - match:
        alertname: DeadMansSwitch
      receiver: 'watchdog'
      repeat_interval: 5m

receivers:
  - name: 'gmah-team'
    email_configs:
      - to: 'team@gmah.com'
        headers:
          Subject: 'GMAH Alert: {{ .GroupLabels.alertname }}'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
        send_resolved: true
        
  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@gmah.com'
    pagerduty_configs:
      - service_key: 'YOUR-PAGERDUTY-KEY'
        description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
    telegram_configs:
      - bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: ${TELEGRAM_CHAT_ID}
        parse_mode: 'HTML'
        
  - name: 'warning-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'Warning Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        
  - name: 'database-team'
    email_configs:
      - to: 'database@gmah.com'
        
  - name: 'watchdog'
    webhook_configs:
      - url: 'http://localhost:5001/watchdog'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
EOF
    
    systemctl enable prometheus grafana-server elasticsearch logstash filebeat
    systemctl restart prometheus grafana-server elasticsearch logstash filebeat
    
    log SUCCESS "Stack de monitoring avancé installé"
}

# ================================================================================
# TESTS AUTOMATIQUES POST-INSTALLATION
# ================================================================================

run_automated_tests() {
    log INFO "Exécution des tests automatiques post-installation..."
    
    local TESTS_PASSED=0
    local TESTS_FAILED=0
    local TEST_RESULTS="/root/gmah-test-results.log"
    
    echo "=================================================================================" > "$TEST_RESULTS"
    echo "GMAH PLATFORM - TEST RESULTS" >> "$TEST_RESULTS"
    echo "Date: $(date)" >> "$TEST_RESULTS"
    echo "=================================================================================" >> "$TEST_RESULTS"
    echo "" >> "$TEST_RESULTS"
    
    # Fonction helper pour les tests
    run_test() {
        local test_name="$1"
        local test_command="$2"
        local expected_result="${3:-0}"
        
        echo -n "Testing: $test_name... "
        echo "Test: $test_name" >> "$TEST_RESULTS"
        echo "Command: $test_command" >> "$TEST_RESULTS"
        
        if eval "$test_command" &>> "$TEST_RESULTS"; then
            if [[ $? -eq $expected_result ]]; then
                echo -e "${GREEN}PASS${NC}"
                echo "Result: PASS" >> "$TEST_RESULTS"
                ((TESTS_PASSED++))
            else
                echo -e "${RED}FAIL${NC}"
                echo "Result: FAIL (unexpected return code)" >> "$TEST_RESULTS"
                ((TESTS_FAILED++))
            fi
        else
            if [[ $? -eq $expected_result ]]; then
                echo -e "${GREEN}PASS${NC}"
                echo "Result: PASS (expected failure)" >> "$TEST_RESULTS"
                ((TESTS_PASSED++))
            else
                echo -e "${RED}FAIL${NC}"
                echo "Result: FAIL" >> "$TEST_RESULTS"
                ((TESTS_FAILED++))
            fi
        fi
        echo "---" >> "$TEST_RESULTS"
    }
    
    # ================================================================================
    # 1. TESTS SYSTÈME
    # ================================================================================
    
    log INFO "1. Tests système..."
    
    run_test "OS Detection" "lsb_release -a"
    run_test "Kernel Version" "uname -r"
    run_test "CPU Cores" "nproc"
    run_test "Memory Available" "free -h | grep Mem"
    run_test "Disk Space" "df -h /"
    run_test "Network Connectivity" "ping -c 1 8.8.8.8"
    run_test "DNS Resolution" "nslookup google.com"
    run_test "System Load" "uptime"
    run_test "Timezone" "timedatectl | grep 'Time zone'"
    
    # ================================================================================
    # 2. TESTS SÉCURITÉ
    # ================================================================================
    
    log INFO "2. Tests sécurité..."
    
    run_test "SSH Port Changed" "grep -q 'Port ${SSH_PORT:-2242}' /etc/ssh/sshd_config"
    run_test "Root Login Disabled" "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config"
    run_test "Password Auth Disabled" "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config"
    run_test "Firewall Status" "ufw status | grep -q 'Status: active'"
    run_test "Fail2ban Status" "systemctl is-active fail2ban"
    run_test "SELinux/AppArmor" "aa-status --enabled 2>/dev/null || getenforce 2>/dev/null | grep -q Enforcing" 0
    run_test "Unattended Upgrades" "systemctl is-active unattended-upgrades"
    run_test "ClamAV Status" "systemctl is-active clamav-daemon"
    run_test "Auditd Status" "systemctl is-active auditd"
    
    # ================================================================================
    # 3. TESTS SERVICES
    # ================================================================================
    
    log INFO "3. Tests services..."
    
    run_test "Nginx Running" "systemctl is-active nginx"
    run_test "Nginx Config Valid" "nginx -t"
    run_test "PostgreSQL Running" "systemctl is-active postgresql"
    run_test "PostgreSQL Connection" "sudo -u postgres psql -c 'SELECT 1;'"
    run_test "Redis Running" "systemctl is-active redis-server"
    run_test "Redis Connection" "redis-cli -a '${REDIS_PASSWORD}' ping | grep -q PONG"
    run_test "Docker Running" "systemctl is-active docker"
    run_test "Docker Test" "docker run --rm hello-world"
    run_test "PM2 Status" "pm2 status"
    
    # ================================================================================
    # 4. TESTS MONITORING
    # ================================================================================
    
    log INFO "4. Tests monitoring..."
    
    run_test "Prometheus Running" "systemctl is-active prometheus"
    run_test "Prometheus Metrics" "curl -s localhost:9090/-/ready | grep -q 'Prometheus is Ready'"
    run_test "Grafana Running" "systemctl is-active grafana-server"
    run_test "Grafana API" "curl -s localhost:3001/api/health | grep -q ok"
    run_test "Elasticsearch Running" "systemctl is-active elasticsearch"
    run_test "Elasticsearch Health" "curl -s localhost:9200/_cluster/health | grep -q green"
    run_test "Logstash Running" "systemctl is-active logstash"
    run_test "Filebeat Running" "systemctl is-active filebeat"
    run_test "Node Exporter" "curl -s localhost:9100/metrics | grep -q node_"
    
    # ================================================================================
    # 5. TESTS APPLICATION
    # ================================================================================
    
    log INFO "5. Tests application..."
    
    run_test "Backend API Health" "curl -s localhost:3333/health | grep -q ok"
    run_test "Frontend Running" "curl -s localhost:3000 | grep -q '<html'"
    run_test "API Response Time" "curl -w '%{time_total}' -o /dev/null -s localhost:3333/health | awk '{if($1<1) exit 0; else exit 1}'"
    run_test "Database Migrations" "cd /home/gmah/gmah-platform && npx prisma migrate status"
    run_test "Redis Cache" "redis-cli -a '${REDIS_PASSWORD}' SET test:key 'test' && redis-cli -a '${REDIS_PASSWORD}' GET test:key | grep -q test"
    
    # ================================================================================
    # 6. TESTS BACKUP
    # ================================================================================
    
    log INFO "6. Tests backup..."
    
    run_test "Backup Script Exists" "test -f /home/gmah/scripts/backup.sh"
    run_test "Backup Directory" "test -d /home/gmah/backups"
    run_test "Cron Jobs" "crontab -l | grep -q backup"
    run_test "S3/R2 Access" "aws s3 ls s3://gmah-storage --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    
    # ================================================================================
    # 7. TESTS SSL
    # ================================================================================
    
    log INFO "7. Tests SSL..."
    
    run_test "SSL Certificate" "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    run_test "SSL Validity" "openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -checkend 86400"
    run_test "SSL Grade" "curl -s https://api.ssllabs.com/api/v3/analyze?host=${DOMAIN} | grep -q '\"grade\":\"A'"
    run_test "HTTPS Redirect" "curl -I http://${DOMAIN} | grep -q '301 Moved Permanently'"
    
    # ================================================================================
    # 8. TESTS PERFORMANCE
    # ================================================================================
    
    log INFO "8. Tests performance..."
    
    run_test "Load Test API" "ab -n 100 -c 10 http://localhost:3333/health 2>&1 | grep -q 'Failed requests:        0'"
    run_test "Database Query Performance" "sudo -u postgres psql -c 'EXPLAIN ANALYZE SELECT 1;' | grep -q 'Planning Time:'"
    run_test "Redis Benchmark" "redis-benchmark -h localhost -p 6379 -a '${REDIS_PASSWORD}' -q -n 1000 SET test 'value' | grep -q 'requests per second'"
    run_test "Nginx Rate Limiting" "for i in {1..20}; do curl -s localhost &; done; wait; nginx -t"
    
    # ================================================================================
    # 9. TESTS DOCKER/KUBERNETES
    # ================================================================================
    
    if command -v docker &>/dev/null; then
        log INFO "9. Tests Docker..."
        
        run_test "Docker Compose" "docker-compose --version"
        run_test "Docker Network" "docker network ls | grep -q gmah"
        run_test "Docker Volumes" "docker volume ls | grep -q gmah"
        run_test "Container Health" "docker ps --filter 'health=healthy' | grep -q gmah"
    fi
    
    if command -v kubectl &>/dev/null; then
        log INFO "10. Tests Kubernetes..."
        
        run_test "K3s Node Ready" "kubectl get nodes | grep -q Ready"
        run_test "Pods Running" "kubectl get pods -n gmah | grep -q Running"
        run_test "Services Active" "kubectl get svc -n gmah"
        run_test "Ingress Working" "kubectl get ingress -n gmah"
    fi
    
    # ================================================================================
    # RÉSUMÉ DES TESTS
    # ================================================================================
    
    echo "" >> "$TEST_RESULTS"
    echo "=================================================================================" >> "$TEST_RESULTS"
    echo "TEST SUMMARY" >> "$TEST_RESULTS"
    echo "=================================================================================" >> "$TEST_RESULTS"
    echo "Tests Passed: $TESTS_PASSED" >> "$TEST_RESULTS"
    echo "Tests Failed: $TESTS_FAILED" >> "$TEST_RESULTS"
    echo "Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%" >> "$TEST_RESULTS"
    echo "" >> "$TEST_RESULTS"
    
    log INFO "Test Summary:"
    log SUCCESS "Tests Passed: $TESTS_PASSED"
    if [[ $TESTS_FAILED -gt 0 ]]; then
        log ERROR "Tests Failed: $TESTS_FAILED"
        log WARNING "Review the test results at: $TEST_RESULTS"
    else
        log SUCCESS "All tests passed! System is ready for production."
    fi
    
    # Générer un rapport HTML
    generate_html_report
    
    return $([ $TESTS_FAILED -eq 0 ])
}

# ================================================================================
# GÉNÉRATION RAPPORT HTML
# ================================================================================

generate_html_report() {
    local REPORT_FILE="/var/www/html/test-report.html"
    
    cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>GMAH Platform - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .pass { color: #4CAF50; font-weight: bold; }
        .fail { color: #f44336; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f5f5f5; }
        .chart { width: 200px; height: 200px; margin: 20px auto; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>GMAH Platform - Installation Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Date: <script>document.write(new Date().toLocaleString());</script></p>
        <p>Tests Passed: <span class="pass">TESTS_PASSED_PLACEHOLDER</span></p>
        <p>Tests Failed: <span class="fail">TESTS_FAILED_PLACEHOLDER</span></p>
        <p>Success Rate: <strong>SUCCESS_RATE_PLACEHOLDER%</strong></p>
    </div>
    
    <canvas id="testChart" class="chart"></canvas>
    
    <h2>Detailed Results</h2>
    <table>
        <tr>
            <th>Category</th>
            <th>Test</th>
            <th>Status</th>
        </tr>
        <!-- Test results will be inserted here -->
    </table>
    
    <script>
        const ctx = document.getElementById('testChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [TESTS_PASSED_PLACEHOLDER, TESTS_FAILED_PLACEHOLDER],
                    backgroundColor: ['#4CAF50', '#f44336']
                }]
            }
        });
    </script>
</body>
</html>
EOF
    
    # Remplacer les placeholders
    sed -i "s/TESTS_PASSED_PLACEHOLDER/$TESTS_PASSED/g" "$REPORT_FILE"
    sed -i "s/TESTS_FAILED_PLACEHOLDER/$TESTS_FAILED/g" "$REPORT_FILE"
    sed -i "s/SUCCESS_RATE_PLACEHOLDER/$(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))/g" "$REPORT_FILE"
    
    log INFO "Rapport HTML généré: http://${DOMAIN}/test-report.html"
}

# Export des fonctions
export -f setup_advanced_monitoring
export -f run_automated_tests
export -f generate_html_report