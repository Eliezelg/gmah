# Architecture Multi-Tenant GMAH Platform

## Vue d'ensemble

Cette documentation décrit l'architecture multi-tenant de la plateforme GMAH, permettant de servir plusieurs organisations indépendantes avec une seule instance d'application mais des bases de données séparées.

## 🏗️ Architecture Choisie: Database par Organisation

### Principe
- **1 Backend NestJS** partagé pour toutes les organisations
- **1 Frontend Next.js** partagé pour toutes les organisations
- **1 Base de données PostgreSQL dédiée** par organisation
- **1 Cache Redis** avec préfixes par organisation
- **1 Stockage de fichiers** avec dossiers isolés par organisation

### Schéma d'Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Clients Web                       │
│  paris.gmah.com | lyon.gmah.com | nice.gmah.com    │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                 Frontend Next.js                     │
│              (Instance unique partagée)              │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                   API Gateway                        │
│              (Nginx - Routing par domaine)          │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                  Backend NestJS                      │
│              (Instance unique stateless)             │
│                                                      │
│  ┌──────────────┐  ┌──────────────────────────┐   │
│  │   Tenant     │  │  Dynamic Prisma Client    │   │
│  │  Middleware  │  │    Connection Manager      │   │
│  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Database   │    │  Database   │    │  Database   │
│   Master    │    │  Org_Paris  │    │  Org_Lyon   │
│             │    │             │    │             │
│ Organizations│   │ Loans,Users │    │ Loans,Users │
│   Metadata  │    │  Payments   │    │  Payments   │
└─────────────┘    └─────────────┘    └─────────────┘

┌─────────────────────────────────────────────────────┐
│                    Redis Cache                       │
│   paris:* | lyon:* | nice:* (préfixes isolés)      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   File Storage                       │
│  /storage/paris/* | /storage/lyon/* | /storage/nice/*│
└─────────────────────────────────────────────────────┘
```

## 🔑 Composants Clés

### 1. Tenant Resolution
- **Méthode principale**: Subdomain (paris.gmah.com → tenant: paris)
- **Méthode alternative**: Header HTTP (X-Tenant-ID: paris)
- **Fallback**: Paramètre URL (?tenant=paris)

### 2. Database Isolation
- Chaque organisation a sa propre base de données PostgreSQL
- Naming convention: `gmah_org_${tenantSlug}`
- Migrations Prisma appliquées indépendamment
- Backups et restaurations indépendants

### 3. Master Database
- Contient les métadonnées des organisations
- Informations de routage
- Configuration et paramètres globaux
- Plans de tarification et limites

## 📋 Avantages de cette Architecture

### Sécurité
- ✅ Isolation complète des données entre organisations
- ✅ Aucun risque de fuite de données cross-tenant
- ✅ Conformité RGPD simplifiée
- ✅ Audit et logs séparés par organisation

### Performance
- ✅ Pas de dégradation liée au volume d'une organisation
- ✅ Optimisation indépendante par base de données
- ✅ Scaling vertical simple par organisation
- ✅ Indexation spécifique possible

### Maintenance
- ✅ Backup/Restore granulaire par organisation
- ✅ Migrations personnalisées possibles
- ✅ Debugging isolé par tenant
- ✅ Monitoring indépendant

### Business
- ✅ Argument de vente fort ("vos données sont isolées")
- ✅ Tarification flexible par ressources utilisées
- ✅ Possibilité d'hébergement dédié pour gros clients
- ✅ Export/suppression simple pour conformité

## 🚀 Processus d'Onboarding

### 1. Création d'une nouvelle organisation

```bash
# Script automatisé
npm run tenant:create -- \
  --name "GMAH Paris" \
  --slug "paris" \
  --domain "paris.gmah.com" \
  --admin-email "admin@gmah-paris.org"
```

Ce script effectue:
1. Création de la base de données dédiée
2. Application des migrations Prisma
3. Seed des données initiales
4. Création du compte administrateur
5. Configuration du subdomain
6. Envoi des credentials par email

### 2. Configuration DNS
```
paris.gmah.com    CNAME    app.gmah.com
```

### 3. Personnalisation
- Logo et couleurs via l'interface admin
- Configuration des règles métier
- Import des données existantes

## 🔧 Implémentation Technique

### Backend - Tenant Middleware
```typescript
// Extraction automatique du tenant depuis le subdomain
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const hostname = req.hostname; // paris.gmah.com
    const subdomain = hostname.split('.')[0];
    
    req['tenantId'] = subdomain;
    next();
  }
}
```

### Backend - Dynamic Database Connection
```typescript
// Connection dynamique selon le tenant
@Injectable()
@Scope(Scope.REQUEST)
export class PrismaService {
  private prisma: PrismaClient;
  
  constructor(@Inject(REQUEST) private request: Request) {
    const tenantId = request['tenantId'] || 'default';
    
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.buildDatabaseUrl(tenantId)
        }
      }
    });
  }
  
  private buildDatabaseUrl(tenantId: string): string {
    const baseUrl = process.env.DATABASE_URL_BASE;
    return `${baseUrl}/gmah_org_${tenantId}`;
  }
}
```

### Frontend - Tenant Context
```typescript
// Context React pour le tenant actuel
export const TenantProvider: React.FC = ({ children }) => {
  const tenant = window.location.hostname.split('.')[0];
  
  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
};
```

## 📊 Gestion des Organisations

### Structure Master Database
```sql
-- Table des organisations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  domain VARCHAR(200) UNIQUE,
  database_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  plan VARCHAR(50) DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Métadonnées et configuration
CREATE TABLE organization_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  feature_key VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'
);
```

## 🛠️ Scripts d'Administration

### Création d'organisation
```bash
# scripts/create-tenant.sh
#!/bin/bash
TENANT_SLUG=$1
TENANT_NAME=$2
ADMIN_EMAIL=$3

# 1. Créer la database
psql -U postgres -c "CREATE DATABASE gmah_org_${TENANT_SLUG};"

# 2. Appliquer les migrations
DATABASE_URL="postgresql://user:pass@localhost/gmah_org_${TENANT_SLUG}" \
  npx prisma migrate deploy

# 3. Seed initial
DATABASE_URL="postgresql://user:pass@localhost/gmah_org_${TENANT_SLUG}" \
  npx prisma db seed

# 4. Enregistrer dans master
psql -U postgres -d gmah_master -c "
  INSERT INTO organizations (slug, name, database_name) 
  VALUES ('${TENANT_SLUG}', '${TENANT_NAME}', 'gmah_org_${TENANT_SLUG}');
"

echo "✅ Organization ${TENANT_NAME} created successfully"
```

### Backup d'organisation
```bash
# scripts/backup-tenant.sh
#!/bin/bash
TENANT_SLUG=$1
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U postgres gmah_org_${TENANT_SLUG} > \
  backups/${TENANT_SLUG}_${DATE}.sql

echo "✅ Backup created: ${TENANT_SLUG}_${DATE}.sql"
```

### Migration globale
```bash
# scripts/migrate-all-tenants.sh
#!/bin/bash
TENANTS=$(psql -U postgres -d gmah_master -t -c \
  "SELECT slug FROM organizations WHERE status='active';")

for TENANT in $TENANTS; do
  echo "Migrating ${TENANT}..."
  DATABASE_URL="postgresql://user:pass@localhost/gmah_org_${TENANT}" \
    npx prisma migrate deploy
done
```

## 📈 Monitoring et Métriques

### Métriques par Organisation
- Taille de la base de données
- Nombre de connexions actives
- Nombre de prêts actifs
- Volume de transactions
- Utilisation du stockage
- Dernière activité

### Dashboard Super Admin
```typescript
interface OrganizationMetrics {
  slug: string;
  name: string;
  metrics: {
    databaseSize: string;
    activeConnections: number;
    totalUsers: number;
    activeLoans: number;
    monthlyTransactions: number;
    storageUsed: string;
    lastActivity: Date;
    healthStatus: 'healthy' | 'warning' | 'critical';
  };
}
```

## 🔐 Sécurité

### Isolation garantie
1. **Network Level**: Connexions database isolées
2. **Application Level**: Tenant ID vérifié à chaque requête
3. **Storage Level**: Dossiers séparés avec permissions
4. **Cache Level**: Préfixes Redis uniques

### Audit Trail
- Logs séparés par organisation
- Traçabilité complète des actions
- Retention configurable par tenant

## 💰 Modèle de Coûts

### Infrastructure
```
Base (serveur + services): 150€/mois
- Peut supporter 50-100 petites organisations
- Ou 10-20 organisations moyennes
- Ou 2-5 grandes organisations

Coût par organisation: ~2-15€/mois selon taille
```

### Pricing suggéré
- **Starter**: 0€ (max 50 membres, features limitées)
- **Community**: 49€/mois (max 500 membres)
- **Professional**: 149€/mois (max 2000 membres)
- **Enterprise**: Sur devis (illimité + SLA)

## 🚦 Checklist de Déploiement

### Phase 1: Infrastructure
- [ ] Setup serveur PostgreSQL avec multi-db
- [ ] Configuration Nginx pour routing subdomain
- [ ] Setup Redis avec namespace
- [ ] Configuration SSL wildcard (*.gmah.com)

### Phase 2: Application
- [ ] Déploiement backend NestJS
- [ ] Déploiement frontend Next.js
- [ ] Configuration variables environnement
- [ ] Tests de routing multi-tenant

### Phase 3: Opérations
- [ ] Scripts d'administration
- [ ] Monitoring et alerting
- [ ] Documentation utilisateur
- [ ] Procédures de support

## 📝 Maintenance

### Tâches quotidiennes
- Vérification des backups
- Monitoring des métriques
- Review des logs d'erreur

### Tâches hebdomadaires
- Analyse de performance
- Mise à jour de sécurité
- Nettoyage des données obsolètes

### Tâches mensuelles
- Review de capacité
- Optimisation des bases
- Audit de sécurité

## 🎯 Évolutions Futures

### Court terme (3-6 mois)
- Interface self-service pour création d'organisation
- Personnalisation avancée par tenant
- API pour intégrations tierces

### Moyen terme (6-12 mois)
- Réplication multi-région
- White-labeling complet
- Module de facturation intégré

### Long terme (12+ mois)
- Version on-premise packageable
- Marketplace d'extensions
- IA/ML pour prédictions par organisation