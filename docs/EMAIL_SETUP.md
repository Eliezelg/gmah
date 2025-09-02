# Configuration du Service Email avec Resend

## Vue d'ensemble

Le système GMAH Platform utilise **Resend** pour l'envoi d'emails transactionnels. Resend est un service moderne d'envoi d'emails qui offre une excellente délivrabilité et une API simple.

## Configuration

### 1. Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte gratuit
3. Vérifiez votre domaine (optionnel mais recommandé pour la production)

### 2. Obtenir la clé API

1. Dans le dashboard Resend, allez dans "API Keys"
2. Créez une nouvelle clé API
3. Copiez la clé (format: `re_xxxxxxxxxxxxx`)

### 3. Configuration de l'environnement

Ajoutez ces variables dans votre fichier `.env`:

```env
# Email Configuration
RESEND_API_KEY="re_votre_cle_api"
EMAIL_FROM="noreply@votredomaine.com"
FRONTEND_URL="http://localhost:3000"
```

### 4. Configuration du domaine (Production)

Pour améliorer la délivrabilité en production:

1. Ajoutez votre domaine dans Resend
2. Configurez les enregistrements DNS:
   - SPF
   - DKIM
   - DMARC (optionnel)

## Types d'emails envoyés

### 1. Email de bienvenue
- **Déclencheur**: Inscription d'un nouvel utilisateur
- **Contenu**: Message de bienvenue et lien vers le dashboard

### 2. Réinitialisation de mot de passe
- **Déclencheur**: Demande de réinitialisation
- **Contenu**: Lien de réinitialisation (expire après 1h)

### 3. Notifications de prêt
- **Approbation**: Email lors de l'approbation d'un prêt
- **Rejet**: Email lors du rejet avec les raisons
- **Décaissement**: Confirmation du décaissement des fonds

### 4. Demande de garantie
- **Déclencheur**: Ajout d'un garant à un prêt
- **Contenu**: Lien pour signer électroniquement

### 5. Rappels de paiement
- **Déclencheur**: 3 jours avant l'échéance
- **Contenu**: Montant dû et lien pour payer

### 6. Notifications au comité
- **Déclencheur**: Nouveau prêt à examiner
- **Contenu**: Détails du prêt et lien pour voter

## Mode développement

En développement (sans clé Resend configurée), les emails sont:
- Loggés dans la console
- Affichés avec leur contenu complet
- Pas réellement envoyés

## Test d'envoi

Pour tester l'envoi d'emails:

```bash
# Test avec curl
curl -X POST http://localhost:3333/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Templates d'emails

Les templates sont définis dans:
`apps/api/src/email/email.service.ts`

Chaque template inclut:
- Version HTML (riche avec styles)
- Version texte (fallback)
- Responsive design
- Support du mode sombre

## Personnalisation

### Modifier les templates

1. Ouvrez `email.service.ts`
2. Modifiez les méthodes de template:
   - `getWelcomeEmailTemplate()`
   - `getPasswordResetTemplate()`
   - `getLoanStatusTemplate()`
   - etc.

### Changer les couleurs

Les couleurs principales sont définies dans chaque template:
- Primary: `#667eea`
- Success: `#28a745`
- Danger: `#dc3545`
- Warning: `#ffc107`

### Ajouter un nouveau type d'email

1. Créez une méthode dans `EmailService`:
```typescript
async sendCustomEmail(email: string, data: any) {
  const html = this.getCustomTemplate(data);
  await this.sendEmail({
    to: email,
    subject: 'Sujet',
    html,
  });
}
```

2. Créez le template:
```typescript
private getCustomTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <!-- Votre HTML -->
    </html>
  `;
}
```

## Monitoring

### Dashboard Resend

Accédez au dashboard pour:
- Voir les emails envoyés
- Analyser les taux d'ouverture
- Gérer les bounces
- Voir les erreurs

### Logs locaux

Les logs d'envoi sont visibles dans:
```bash
npm run start:dev
# Cherchez les lignes avec [EmailService]
```

## Limites

### Plan gratuit Resend
- 100 emails/jour
- 3000 emails/mois
- 1 domaine

### Plan Pro
- 50,000 emails/mois
- Domaines illimités
- Support prioritaire

## Troubleshooting

### Email non reçu
1. Vérifiez les logs du serveur
2. Vérifiez le dashboard Resend
3. Vérifiez les spams
4. Vérifiez la configuration DNS

### Erreur d'envoi
1. Vérifiez la clé API
2. Vérifiez le format de l'email
3. Vérifiez les limites de rate

### Template cassé
1. Testez avec un client email différent
2. Validez le HTML
3. Vérifiez l'encodage des caractères

## Support

- Documentation Resend: [docs.resend.com](https://docs.resend.com)
- Support GMAH: Issues GitHub
- Email: support@votredomaine.com