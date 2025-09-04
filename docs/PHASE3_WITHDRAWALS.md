# Phase 3: Gestion des Remboursements Dépositaires

## Vue d'ensemble

Cette phase implémente un système complet de gestion des demandes de retrait pour les dépositaires, avec des workflows d'approbation automatiques et manuels, une évaluation d'impact sur la trésorerie en temps réel, et une interface utilisateur complète.

## Architecture

### Backend (NestJS)

#### Modèles Prisma

**Nouveaux modèles ajoutés:**
- `Deposit` - Représente les dépôts des utilisateurs
- `WithdrawalRequest` - Demandes de retrait avec workflow d'approbation
- Enums: `WithdrawalStatus`, `ApprovalMode`

**Relations étendues:**
- User -> Deposits, WithdrawalRequests (comme dépositaire)
- User -> ApprovedWithdrawals, RejectedWithdrawals (comme approbateur)
- Document, Notification, AuditLog -> WithdrawalRequest
- TreasuryFlow -> WithdrawalRequest (impact trésorerie)

#### API Endpoints

**Module Withdrawals (`/api/withdrawals`)**
```
POST /request              - Créer demande de retrait
GET /                      - Liste des demandes (avec filtres)
GET /:id                   - Détail d'une demande
PATCH /:id                 - Modifier demande (seulement si PENDING)
POST /:id/approve          - Approuver demande (admin/trésorier)
POST /:id/reject           - Rejeter demande (admin/trésorier)
POST /:id/execute          - Exécuter retrait approuvé
GET /impact                - Impact trésorerie
```

**Module Deposits (`/api/deposits`)**
```
GET /my-deposits           - Dépôts de l'utilisateur connecté
GET /:id                   - Détail d'un dépôt
```

#### Logique Métier

**Approbation Automatique:**
- Montants < 1000 ILS: Auto-approuvés
- Urgence non-critique: Auto-approuvés si montant < seuil

**Approbation Manuelle:**
- Montants 1000-10000 ILS: Approbation admin/trésorier
- Montants > 10000 ILS: Approbation comité

**Validation:**
- Vérification solde disponible
- Génération numéro unique (WR-YYYY-XXXXXX)
- Calcul impact trésorerie
- Création flux trésorerie prévisionnels

### Frontend (Next.js)

#### Pages Principales

**Dépositaire (`/depositor/withdrawals`)**
- Dashboard personnel avec statistiques
- Formulaire de demande de retrait
- Liste des demandes avec filtres
- Détails des demandes avec timeline

**Admin (`/admin/withdrawals`)**
- Queue d'approbation avec filtres
- Actions groupées (bulk approval)
- Widget impact trésorerie
- Paramètres et seuils configurables
- Analytiques et rapports

#### Composants Clés

**`WithdrawalRequestForm`**
- Formulaire validé avec Zod
- Sélection dépôt avec solde disponible
- Validation temps réel du montant
- Coordonnées bancaires conditionnelles

**`WithdrawalsList`**
- Table responsive avec pagination
- Filtres par statut, urgence, dates
- Actions contextuelles par rôle
- Export des données

**`WithdrawalStatusCard`**
- Carte de statut avec progress bar
- Timeline des événements
- Actions selon permissions utilisateur
- Mode compact et détaillé

**`TreasuryImpactWidget`**
- Impact temps réel sur trésorerie
- Breakdown par statut et urgence
- Alertes et recommandations
- Intégration prévisions existantes

## Internationalisation

### Clés ajoutées (FR/EN)

```json
"withdrawals": {
  "form": {
    "title": "Demande de Retrait",
    "validation": { ... }
  },
  "statuses": {
    "PENDING": "En attente",
    "APPROVED": "Approuvé",
    // ...
  },
  "admin": {
    "queue": { ... },
    "settings": { ... }
  },
  "treasury": {
    "impact": { ... }
  }
}
```

## Fonctionnalités Clés

### Workflow d'Approbation

1. **Création Demande**
   - Validation montant vs solde disponible
   - Détermination mode d'approbation automatique
   - Génération impact trésorerie

2. **Traitement**
   - Auto-approbation si critères remplis
   - File d'attente admin pour approbation manuelle
   - Notifications automatiques aux parties prenantes

3. **Exécution**
   - Mise à jour solde dépôt
   - Création flux trésorerie réels
   - Traçabilité complète via audit logs

### Sécurité et Permissions

**Dépositaire:**
- Créer/modifier ses propres demandes (si PENDING)
- Voir ses demandes et historique

**Admin/Trésorier:**
- Approuver/rejeter toutes demandes
- Voir impact trésorerie global
- Configurer seuils et paramètres

**Comité:**
- Approuver/rejeter demandes nécessitant vote collectif

### Impact Trésorerie

- **Calcul Temps Réel:** Integration avec TreasuryForecastService existant
- **Projections:** Création automatique de flux prévisionnels
- **Alertes:** Notifications basées sur seuils configurables
- **Reporting:** Breakdown par statut, urgence, période

## Types TypeScript

```typescript
interface WithdrawalRequest {
  id: string;
  requestNumber: string;
  depositId: string;
  amount: number;
  reason: string;
  status: WithdrawalStatus;
  approvalMode: ApprovalMode;
  // ...relations et métadonnées
}

enum WithdrawalStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}
```

## Services API

```typescript
// Service côté client
export class WithdrawalsService {
  static async create(data: CreateWithdrawalRequest): Promise<WithdrawalRequest>
  static async getAll(query?: WithdrawalQuery): Promise<WithdrawalListResponse>
  static async approve(id: string, data: ApproveWithdrawalRequest): Promise<WithdrawalRequest>
  static async getTreasuryImpact(query?): Promise<TreasuryImpact>
}
```

## Installation et Configuration

### Pré-requis
- Phase 1 et 2 du projet GMAH Platform installées
- Base de données PostgreSQL configurée
- Services de trésorerie existants fonctionnels

### Migration Base de Données
```bash
npx prisma generate
npx prisma db push
```

### Variables d'Environnement
Aucune nouvelle variable requise - utilise la configuration existante.

### Démarrage
```bash
# Backend
npm run dev:api

# Frontend  
npm run dev:web
```

## Tests et Validation

### Données de Test
Le système crée automatiquement des dépôts d'exemple pour les nouveaux utilisateurs:
- Dépôt épargne: 45,000 ILS disponibles sur 50,000 ILS
- Fonds d'urgence: 25,000 ILS disponibles  
- Dépôt à terme: 80,000 ILS disponibles sur 100,000 ILS

### Scénarios de Test
1. **Demande Auto-Approuvée:** Montant < 1000 ILS, urgence normale
2. **Demande Manuelle:** Montant 5000 ILS, statut PENDING
3. **Impact Trésorerie:** Vérification calculs et alertes
4. **Permissions:** Accès selon rôles utilisateurs

## Intégration Existante

### Services Utilisés
- **TreasuryForecastService:** Calcul impact et projections
- **NotificationsService:** Alertes workflow
- **EmailService:** Confirmations et notifications
- **AuditService:** Traçabilité complète

### Modules Étendus
- **User:** Relations dépositaire ajoutées
- **Document:** Support documents retrait
- **TreasuryFlow:** Support flux retrait

## Roadmap et Améliorations Futures

### Phase 3.1 - Fonctionnalités Avancées
- [ ] Workflow d'approbation par comité avec votes
- [ ] Intégration APIs bancaires pour virements automatiques
- [ ] Rapports avancés et analytiques
- [ ] Notifications push et SMS

### Phase 3.2 - Optimisations
- [ ] Cache Redis pour performances
- [ ] Batch processing pour gros volumes
- [ ] API webhooks pour intégrations tierces
- [ ] Audit trail avancé avec signatures électroniques

## Support et Maintenance

### Logs et Monitoring
- Tous les événements sont tracés via AuditLog
- Métriques de performance via endpoints dédiés
- Alertes automatiques pour anomalies

### Dépannage
- Vérifier permissions utilisateur si accès refusé
- Contrôler soldes dépôts si validation échoue
- Consulter logs API pour erreurs serveur

Cette phase constitue un module complet et autonome s'intégrant parfaitement avec l'architecture existante du projet GMAH Platform.