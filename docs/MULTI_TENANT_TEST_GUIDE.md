# Guide de Test Multi-Tenant GMAH Platform

## Configuration Implémentée

### ✅ Architecture Multi-Tenant Complète

1. **Backend (NestJS)**
   - Middleware de détection de tenant par subdomain
   - Service Prisma dynamique par tenant
   - API de gestion des organisations
   - API de gestion des domaines personnalisés
   - Support cache Redis par tenant

2. **Frontend (Next.js)**
   - Détection automatique du tenant
   - Context Provider pour settings du tenant
   - Page d'accueil personnalisable
   - Support multi-domaines

3. **Base de Données**
   - Une DB PostgreSQL par organisation
   - Master DB pour métadonnées
   - Migrations indépendantes

## Test Manuel de l'Architecture

### 1. Préparation

```bash
# Installer les dépendances
cd /home/eli/Documents/Gmah/gmah-platform
npm install

# Démarrer PostgreSQL et Redis (si Docker disponible)
docker-compose up -d postgres redis
```

### 2. Démarrer les Services

**Terminal 1 - Backend:**
```bash
cd apps/api
npm run start:dev
# API disponible sur http://localhost:3333
```

**Terminal 2 - Frontend:**
```bash
cd apps/web  
npm run dev
# Frontend disponible sur http://localhost:3001
```

### 3. Tester la Création d'Organisation

#### Via l'Interface Web:
1. Ouvrir http://localhost:3001/signup-organization
2. Remplir le formulaire:
   - Nom: GMAH Test Paris
   - Identifiant: test-paris
   - Email admin: admin@test-paris.org
   - Adresse et autres infos
3. Soumettre le formulaire

#### Via Script:
```bash
cd scripts/tenant-management
./create-tenant.sh test-paris "GMAH Test Paris" admin@test-paris.org
```

#### Via API:
```bash
curl -X POST http://localhost:3333/api/organizations/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "GMAH Test Paris",
    "slug": "test-paris",
    "adminName": "Jean Test",
    "adminEmail": "admin@test-paris.org",
    "address": "123 Rue Test",
    "city": "Paris",
    "postalCode": "75001",
    "country": "France",
    "acceptTerms": true,
    "acceptDataProcessing": true
  }'
```

### 4. Tester l'Accès Tenant

#### Configuration Hosts:
Ajouter dans `/etc/hosts`:
```
127.0.0.1 test-paris.gmah.com
127.0.0.1 test-lyon.gmah.com
```

#### Accès aux Sites:
- **Site Principal**: http://localhost:3001
  - Landing page de présentation
  - Formulaire d'inscription

- **Site Tenant**: http://test-paris.gmah.com:3001
  - Page d'accueil personnalisée
  - Login/Register pour ce tenant
  - Dashboard spécifique

### 5. Tester les Domaines Personnalisés

#### Ajouter un Domaine:
```bash
# Nécessite un token d'auth (obtenir via login)
curl -X POST http://localhost:3333/api/domains/organization/{orgId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "gmah-test.local",
    "verificationMethod": "DNS_TXT",
    "isPrimary": true
  }'
```

#### Vérifier le Domaine:
```bash
curl -X PUT http://localhost:3333/api/domains/{domainId}/verify \
  -H "Authorization: Bearer {token}"
```

#### Lookup Tenant par Domaine:
```bash
curl -X POST http://localhost:3333/api/domains/lookup \
  -H "Content-Type: application/json" \
  -d '{"domain": "test-paris.gmah.com"}'
```

## Endpoints Disponibles

### Organizations API
- `POST /api/organizations/signup` - Créer une organisation
- `GET /api/organizations/check-slug/{slug}` - Vérifier disponibilité
- `GET /api/organizations` - Lister les organisations (admin)
- `GET /api/organizations/{slug}` - Détails d'une organisation

### Tenants API  
- `GET /api/tenants/{tenant}/settings` - Paramètres du tenant
- `PUT /api/tenants/{tenant}/settings` - Mettre à jour les paramètres
- `POST /api/tenants/{tenant}/logo` - Upload logo
- `GET /api/tenants/{tenant}/statistics` - Statistiques

### Domains API
- `POST /api/domains/lookup` - Lookup tenant par domaine
- `GET /api/domains/organization/{orgId}` - Lister les domaines
- `POST /api/domains/organization/{orgId}` - Ajouter un domaine
- `PUT /api/domains/{domainId}/verify` - Vérifier le domaine
- `DELETE /api/domains/{domainId}` - Supprimer un domaine

## Structure des Données

### Organisation (Master DB)
```typescript
{
  id: string;
  slug: string;           // test-paris
  name: string;          // GMAH Test Paris
  domain: string;        // test-paris.gmah.com
  databaseName: string;  // gmah_org_test_paris
  status: 'ACTIVE' | 'SUSPENDED';
  settings: {
    logo?: string;
    primaryColor?: string;
    homeTitle?: string;
    // ...
  };
}
```

### Custom Domain
```typescript
{
  id: string;
  organizationId: string;
  domain: string;              // gmah-test.org
  status: 'PENDING' | 'VERIFIED';
  verificationMethod: 'DNS_TXT' | 'DNS_CNAME';
  verificationToken: string;
  isPrimary: boolean;
}
```

## Personnalisation Disponible

Chaque organisation peut personnaliser:
- **Branding**: Logo, favicon, couleurs
- **Contenu**: Titre, description, hero image
- **Footer**: Texte personnalisé
- **Contact**: Email, téléphone, adresse
- **Social**: URLs réseaux sociaux
- **Domaines**: Multiples domaines personnalisés

## Scripts Utiles

```bash
# Créer une organisation
./scripts/tenant-management/create-tenant.sh {slug} {name} {email}

# Backup d'une organisation
./scripts/tenant-management/backup-tenant.sh {slug}

# Restaurer une organisation
./scripts/tenant-management/restore-tenant.sh {slug} {date}

# Lister les organisations
./scripts/tenant-management/list-tenants.sh

# Migrer toutes les DBs
./scripts/tenant-management/migrate-all-tenants.sh
```

## Test Automatisé

Exécuter le script de test complet:
```bash
./test-multi-tenant.sh
```

Ce script teste:
- Disponibilité des services
- Création d'organisation
- Lookup de domaine
- Détection de tenant
- Settings API

## Troubleshooting

### Problème: "Database does not exist"
```bash
# Créer la base master
psql -U postgres -c "CREATE DATABASE gmah_master;"
```

### Problème: "Subdomain not detected"
- Vérifier /etc/hosts
- Utiliser le port dans l'URL: test-paris.gmah.com:3001
- Vérifier les cookies dans le navigateur

### Problème: "Cannot connect to Redis"
```bash
# Démarrer Redis
redis-server
# Ou avec Docker
docker run -d -p 6379:6379 redis:alpine
```

## Résumé

Le système multi-tenant est entièrement fonctionnel avec:
- ✅ Une base de données par organisation
- ✅ Détection automatique par subdomain
- ✅ Support domaines personnalisés illimités
- ✅ Personnalisation complète par tenant
- ✅ Cache et performances optimisées
- ✅ Scripts de gestion complets

Chaque GMAH peut avoir son identité propre tout en utilisant la même plateforme!