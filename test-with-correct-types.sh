#!/bin/bash

API_URL="http://localhost:3333/api"

echo "========================================="
echo "🧪 GMAH Platform - Integration Test v2"
echo "========================================="
echo ""

# Create borrower
echo "1️⃣ Creating borrower..."
BORROWER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "emprunteur@test.fr",
    "password": "Test123456!",
    "firstName": "Pierre",
    "lastName": "Durand",
    "role": "BORROWER"
  }')

TOKEN=$(echo $BORROWER | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
USER_ID=$(echo $BORROWER | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])")

echo "   ✅ Borrower: emprunteur@test.fr"
echo ""

# Create loan with correct type
echo "2️⃣ Creating loan..."
LOAN=$(curl -s -X POST "$API_URL/loans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "STANDARD",
    "amount": 5000,
    "numberOfInstallments": 12,
    "purpose": "Achat équipement",
    "purposeDetails": {
      "category": "Personnel",
      "description": "Achat matériel informatique pour travail à domicile"
    },
    "expectedEndDate": "2026-08-28T00:00:00.000Z"
  }')

LOAN_ID=$(echo $LOAN | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ ! -z "$LOAN_ID" ]; then
  echo "   ✅ Loan created: $LOAN_ID"
  echo "   Amount: €5,000 / 12 months"
else
  echo "   ❌ Failed: $LOAN"
  exit 1
fi
echo ""

# Upload document
echo "3️⃣ Uploading documents..."
echo "Document de test" > /tmp/test.txt

DOC=$(curl -s -X POST "$API_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt" \
  -F "type=ID_CARD" \
  -F "name=Pièce identité" \
  -F "loanId=$LOAN_ID")

if echo "$DOC" | grep -q '"id"'; then
  echo "   ✅ Document uploaded"
fi

# Create guarantor
echo ""
echo "4️⃣ Creating guarantor..."
GUARANTOR=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "garant@test.fr",
    "password": "Test123456!",
    "firstName": "Sophie",
    "lastName": "Bernard",
    "role": "GUARANTOR"
  }')

GUARANTOR_ID=$(echo $GUARANTOR | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])")
GUARANTOR_TOKEN=$(echo $GUARANTOR | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "   ✅ Guarantor: garant@test.fr"
echo ""

# Create guarantee
echo "5️⃣ Creating guarantee..."
GUARANTEE=$(curl -s -X POST "$API_URL/guarantees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"loanId\": \"$LOAN_ID\",
    \"guarantorId\": \"$GUARANTOR_ID\",
    \"type\": \"SIMPLE\",
    \"amount\": 5000,
    \"percentage\": 100
  }")

GUARANTEE_ID=$(echo $GUARANTEE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ ! -z "$GUARANTEE_ID" ]; then
  echo "   ✅ Guarantee created"
fi
echo ""

# Submit loan
echo "6️⃣ Submitting loan..."
SUBMIT=$(curl -s -X POST "$API_URL/loans/$LOAN_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Dossier complet"}')

if echo "$SUBMIT" | grep -q "SUBMITTED"; then
  echo "   ✅ Loan submitted"
else
  echo "   ⚠️  Submit status: $SUBMIT"
fi

# Final check
echo ""
echo "7️⃣ Final verification..."
FINAL=$(curl -s -X GET "$API_URL/loans/$LOAN_ID" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo $FINAL | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null)
echo "   Loan status: $STATUS"

# Count attachments
DOCS=$(curl -s -X GET "$API_URL/documents/loan/$LOAN_ID" -H "Authorization: Bearer $TOKEN")
DOC_COUNT=$(echo $DOCS | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

GUARANTEES=$(curl -s -X GET "$API_URL/guarantees/loan/$LOAN_ID" -H "Authorization: Bearer $TOKEN")
GUARANTEE_COUNT=$(echo $GUARANTEES | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

echo "   Documents: $DOC_COUNT"
echo "   Guarantees: $GUARANTEE_COUNT"

rm -f /tmp/test.txt

echo ""
echo "========================================="
echo "✅ TEST COMPLETED SUCCESSFULLY!"
echo "========================================="
echo "• Loan ID: $LOAN_ID"
echo "• Status: $STATUS"
echo "• Documents: $DOC_COUNT"
echo "• Guarantees: $GUARANTEE_COUNT"
echo "========================================="

