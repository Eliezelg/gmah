# Guide d'accès Admin - Plateforme GMAH

## 🚀 Démarrage rapide

### 1. Démarrer l'application
```bash
./start-and-login.sh
```

Ce script va :
- Vérifier PostgreSQL
- Créer la base de données si nécessaire
- Appliquer les migrations
- Créer le super admin
- Démarrer l'application

### 2. Accès au Dashboard Admin

#### URLs importantes :
- **Application Web** : http://localhost:3000
- **API Backend** : http://localhost:3333
- **Dashboard Admin** : http://localhost:3000/admin/dashboard

#### Identifiants Super Admin :
- **Email** : admin@gmah.org
- **Mot de passe** : Admin123!@#

## 📝 Étapes de connexion

1. Ouvrir votre navigateur
2. Aller sur http://localhost:3000/login
3. Entrer les identifiants ci-dessus
4. Cliquer sur "Se connecter"
5. Vous serez redirigé vers le dashboard admin

## 🔧 Résolution des problèmes

### Erreur 401 (Non autorisé)
- Vérifiez que vous êtes bien connecté
- Essayez de vous reconnecter

### L'application ne démarre pas
```bash
# Vérifier les ports
lsof -i :3000  # Frontend
lsof -i :3333  # Backend

# Tuer les processus si nécessaire
pkill -f "node"

# Redémarrer
./start-and-login.sh
```

### Base de données non accessible
```bash
# Vérifier PostgreSQL
sudo systemctl status postgresql

# Redémarrer si nécessaire
sudo systemctl restart postgresql

# Vérifier la connexion
PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;"
```

### Réinitialiser le super admin
```bash
cd apps/api
npm run prisma:seed
```

## 🎯 Fonctionnalités Admin disponibles

Une fois connecté en tant que Super Admin, vous avez accès à :

### Dashboard principal
- Vue d'ensemble des statistiques
- Graphiques de performance
- Alertes et notifications

### Gestion des prêts
- Voir toutes les demandes de prêt
- Approuver/Rejeter les demandes
- Mode décideur unique ou comité
- Suivre l'état des prêts

### Gestion des utilisateurs
- Créer de nouveaux utilisateurs
- Assigner des rôles
- Gérer les permissions

### Trésorerie
- Prévisions de trésorerie
- Gestion des retraits
- Analyse financière

### Calendrier
- Événements système
- Échéances de paiement
- Réunions du comité

### Import/Export
- Importer des données en masse
- Exporter des rapports

## 🔐 Sécurité

### Changement du mot de passe
1. Connectez-vous
2. Allez dans Paramètres > Profil
3. Changez votre mot de passe

### Activation 2FA (recommandé)
1. Paramètres > Sécurité
2. Activer l'authentification à deux facteurs
3. Scanner le QR code avec votre application d'authentification

## 📊 Structure des rôles

| Rôle | Permissions |
|------|------------|
| SUPER_ADMIN | Accès complet à toutes les fonctionnalités |
| ADMIN | Gestion des prêts, utilisateurs, trésorerie |
| SECRETARY | Gestion documentaire, communications |
| TREASURER | Gestion financière, rapports |
| COMMITTEE_MEMBER | Vote sur les demandes de prêt |
| LENDER | Consultation de ses contributions |
| BORROWER | Demandes de prêt, suivi des remboursements |
| GUARANTOR | Gestion des garanties |
| AUDITOR | Accès lecture seule pour audit |

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console
2. Consultez le fichier `apps/api/prisma/seed.ts` pour la création du super admin
3. Vérifiez que toutes les variables d'environnement sont configurées dans `.env`

## 📁 Fichiers importants

- `/apps/api/prisma/seed.ts` - Script de création du super admin
- `/apps/web/app/[locale]/(dashboard)/admin/` - Pages du dashboard admin
- `/SUPER_ADMIN_CREDENTIALS.md` - Identifiants du super admin
- `/.env` - Variables d'environnement