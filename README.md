# GMAH Platform

Plateforme de gestion pour GMAH (Gmilus Hasdei Malveh) - Système de prêts sans intérêt communautaire.

## 🚀 Stack Technique

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Shadcn/ui
- **Backend**: NestJS, Prisma ORM
- **Database**: PostgreSQL 15+
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **Monorepo**: Turborepo

## 📋 Prérequis

- Node.js 18+
- Docker & Docker Compose
- npm 8+

## 🛠️ Installation

### 1. Cloner le projet

```bash
git clone <repo-url>
cd gmah-platform
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

```bash
# Copier les fichiers d'environnement
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

### 4. Démarrer les services Docker

```bash
npm run docker:up
```

### 5. Initialiser la base de données

```bash
npm run db:push
```

## 🚀 Développement

### Démarrer tous les services

```bash
npm run dev
```

### Démarrer uniquement l'API

```bash
npm run dev:api
```

### Démarrer uniquement le frontend

```bash
npm run dev:web
```

### Accès aux services

- **Frontend**: http://localhost:3001
- **API**: http://localhost:3333
- **API Documentation (Swagger)**: http://localhost:3333/api
- **Prisma Studio**: `npm run db:studio` puis http://localhost:5555

## 📚 Commandes Utiles

### Base de données

```bash
# Appliquer les migrations
npm run db:migrate

# Pousser le schéma sans migration
npm run db:push

# Générer le client Prisma
npm run db:generate

# Ouvrir Prisma Studio
npm run db:studio
```

### Tests

```bash
# Lancer tous les tests
npm run test

# Tests E2E
npm run test:e2e
```

### Qualité du code

```bash
# Linter
npm run lint

# Formatter
npm run format

# Type checking
npm run check-types
```

### Docker

```bash
# Démarrer les conteneurs
npm run docker:up

# Arrêter les conteneurs
npm run docker:down

# Voir les logs
npm run docker:logs
```

## 📁 Structure du Projet

```
gmah-platform/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js
├── packages/         # Packages partagés
├── docker-compose.yml
└── turbo.json
```

## 🔐 Sécurité

- Authentification JWT avec refresh tokens
- 2FA (Two-Factor Authentication)
- Chiffrement des données sensibles
- Rate limiting
- Validation des entrées avec Zod
- Headers de sécurité

## 📝 Documentation

- [Cahier des charges](../Cahier%20des%20charges%20-%20Gmah.md)
- [Plan de développement](../PLAN_DEVELOPPEMENT.md)
- [Guide Claude](../CLAUDE.md)

## 🤝 Contribution

1. Créer une branche feature: `git checkout -b feature/ma-feature`
2. Commiter les changements: `git commit -m 'Ajout de ma feature'`
3. Pousser la branche: `git push origin feature/ma-feature`
4. Créer une Pull Request

## 📄 License

Propriétaire - Tous droits réservés
