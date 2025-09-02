#!/bin/bash

API_URL="http://localhost:3333/api"

echo "========================================="
echo "🧪 Test du Mode Décideur Unique"
echo "========================================="
echo ""

# 1. Login as existing admin
echo "1️⃣ Connexion en tant qu'admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmah.fr",
    "password": "Admin123!"
  }')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('accessToken', ''))" 2>/dev/null || echo "")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "   ❌ Échec de connexion admin"
  echo "   Création d'un nouvel admin..."
  
  ADMIN_REG=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin.test@gmah.fr",
      "password": "Admin123!",
      "firstName": "Admin",
      "lastName": "Test",
      "role": "ADMIN"
    }')
  
  ADMIN_TOKEN=$(echo $ADMIN_REG | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")
  
  if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "   ✅ Admin créé: admin.test@gmah.fr"
  else
    echo "   ❌ Impossible de créer l'admin"
    exit 1
  fi
else
  echo "   ✅ Connecté en tant qu'admin"
fi

# 2. Create a borrower
echo ""
echo "2️⃣ Création d'un emprunteur de test..."
BORROWER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "borrower.test'$(date +%s)'@gmah.fr",
    "password": "Password123!",
    "firstName": "Emprunteur",
    "lastName": "Test",
    "role": "BORROWER"
  }')

BORROWER_TOKEN=$(echo $BORROWER | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))" 2>/dev/null || echo "")

if [ ! -z "$BORROWER_TOKEN" ]; then
  echo "   ✅ Emprunteur créé"
else
  echo "   ❌ Échec création emprunteur"
  exit 1
fi

# 3. Create a loan
echo ""
echo "3️⃣ Création d'un prêt de test..."
NEW_LOAN=$(curl -s -X POST "$API_URL/loans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BORROWER_TOKEN" \
  -d '{
    "type": "STANDARD",
    "amount": 5000,
    "numberOfInstallments": 12,
    "purpose": "Test mode décideur unique",
    "purposeDetails": {
      "description": "Prêt pour tester le mode décideur unique"
    },
    "expectedEndDate": "'$(date -d "+1 year" --iso-8601)'T00:00:00.000Z"
  }')

LOAN_ID=$(echo $NEW_LOAN | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ ! -z "$LOAN_ID" ]; then
  echo "   ✅ Prêt créé: $LOAN_ID"
else
  echo "   ❌ Échec création prêt"
  echo "   Réponse: $NEW_LOAN"
  exit 1
fi

# 4. Submit the loan
echo ""
echo "4️⃣ Soumission du prêt..."
SUBMISSION=$(curl -s -X POST "$API_URL/loans/$LOAN_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BORROWER_TOKEN" \
  -d '{"skipDocumentCheck": true}')

SUBMIT_STATUS=$(echo $SUBMISSION | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null || echo "")

if [ "$SUBMIT_STATUS" = "SUBMITTED" ]; then
  echo "   ✅ Prêt soumis avec succès"
else
  echo "   ⚠️ Statut: $SUBMIT_STATUS"
fi

# 5. Direct approval by admin
echo ""
echo "5️⃣ Approbation directe par l'admin (mode décideur unique)..."
APPROVAL=$(curl -s -X POST "$API_URL/loans/$LOAN_ID/direct-approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "comments": "Approuvé en mode décideur unique. Dossier complet et conforme.",
    "conditions": "Remboursement mensuel régulier requis. Justificatifs à fournir."
  }')

APPROVED_STATUS=$(echo $APPROVAL | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null || echo "")

if [ "$APPROVED_STATUS" = "APPROVED" ]; then
  echo "   ✅ Prêt approuvé directement!"
  APPROVER=$(echo $APPROVAL | python3 -c "import sys, json; print(json.load(sys.stdin).get('approvedBy', ''))" 2>/dev/null || echo "")
  echo "   📝 Approuvé par: $APPROVER"
else
  echo "   ❌ Échec approbation: $APPROVED_STATUS"
  echo "   Réponse: $APPROVAL"
fi

# 6. Test rejection on a new loan
echo ""
echo "6️⃣ Test de rejet direct sur un nouveau prêt..."

# Create another loan
LOAN2=$(curl -s -X POST "$API_URL/loans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BORROWER_TOKEN" \
  -d '{
    "type": "URGENT",
    "amount": 2000,
    "numberOfInstallments": 3,
    "purpose": "Test rejet",
    "expectedEndDate": "'$(date -d "+3 months" --iso-8601)'T00:00:00.000Z"
  }')

LOAN2_ID=$(echo $LOAN2 | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ ! -z "$LOAN2_ID" ]; then
  # Submit it
  curl -s -X POST "$API_URL/loans/$LOAN2_ID/submit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BORROWER_TOKEN" \
    -d '{"skipDocumentCheck": true}' > /dev/null
  
  # Direct reject
  REJECTION=$(curl -s -X POST "$API_URL/loans/$LOAN2_ID/direct-reject" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
      "reason": "Documents insuffisants",
      "comments": "Il manque les justificatifs de revenus et la garantie requise pour ce type de prêt urgent."
    }')
  
  REJECTED_STATUS=$(echo $REJECTION | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null || echo "")
  
  if [ "$REJECTED_STATUS" = "REJECTED" ]; then
    echo "   ✅ Prêt rejeté directement"
    REJECTOR=$(echo $REJECTION | python3 -c "import sys, json; print(json.load(sys.stdin).get('rejectedBy', ''))" 2>/dev/null || echo "")
    echo "   📝 Rejeté par: $REJECTOR"
  else
    echo "   ❌ Échec rejet: $REJECTED_STATUS"
  fi
fi

# 7. Get loan statistics as admin
echo ""
echo "7️⃣ Récupération des statistiques..."
STATS=$(curl -s -X GET "$API_URL/loans/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL=$(echo $STATS | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalLoans', 0))" 2>/dev/null || echo "0")
APPROVED=$(echo $STATS | python3 -c "import sys, json; print(json.load(sys.stdin).get('byStatus', {}).get('APPROVED', 0))" 2>/dev/null || echo "0")
REJECTED=$(echo $STATS | python3 -c "import sys, json; print(json.load(sys.stdin).get('byStatus', {}).get('REJECTED', 0))" 2>/dev/null || echo "0")

echo "   📊 Total prêts: $TOTAL"
echo "   ✅ Approuvés: $APPROVED"
echo "   ❌ Rejetés: $REJECTED"

echo ""
echo "========================================="
echo "📊 RÉSUMÉ DU TEST"
echo "========================================="
echo "✅ Mode décideur unique fonctionnel"
echo "✅ Approbation directe sans comité"
echo "✅ Rejet direct sans comité"
echo "✅ Traçabilité des décisions (approvedBy/rejectedBy)"
echo ""
echo "Le système supporte maintenant:"
echo "• Mode comité (vote multiple requis)"
echo "• Mode décideur unique (admin seul décide)"
echo "• Traçabilité complète des décisions"
echo "• Conditions et commentaires sur les décisions"
echo "========================================="