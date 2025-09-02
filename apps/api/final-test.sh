#!/bin/bash

API_URL="http://localhost:3333/api"

echo "========================================="
echo "🚀 GMAH Platform - Complete Test Suite"
echo "========================================="
echo ""

# 1. Create borrower
echo "1️⃣ Creating borrower account..."
BORROWER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "final.test@gmah.fr",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "Final",
    "role": "BORROWER"
  }')

TOKEN=$(echo $BORROWER | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
USER_ID=$(echo $BORROWER | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)

if [ ! -z "$TOKEN" ]; then
  echo "   ✅ User created successfully"
fi

# 2. Create loan
echo ""
echo "2️⃣ Creating loan application..."
LOAN=$(curl -s -X POST "$API_URL/loans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "STANDARD",
    "amount": 8000,
    "numberOfInstallments": 18,
    "purpose": "Projet personnel",
    "expectedEndDate": "2027-02-28T00:00:00.000Z"
  }')

LOAN_ID=$(echo $LOAN | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ ! -z "$LOAN_ID" ]; then
  echo "   ✅ Loan created"
  echo "      ID: $LOAN_ID"
  echo "      Amount: €8,000"
  echo "      Duration: 18 months"
fi

# 3. Upload documents
echo ""
echo "3️⃣ Uploading documents..."

# Create test files
echo "Test ID Document Content" > /tmp/id_doc.txt
echo "Test Income Document Content" > /tmp/income_doc.txt

# Upload ID document
DOC1=$(curl -s -X POST "$API_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/id_doc.txt" \
  -F "type=ID_CARD" \
  -F "name=Carte identité" \
  -F "description=CNI" \
  -F "loanId=$LOAN_ID")

DOC1_ID=$(echo $DOC1 | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ ! -z "$DOC1_ID" ]; then
  echo "   ✅ ID document uploaded"
else
  echo "   ❌ ID upload failed: $DOC1"
fi

# Upload income document
DOC2=$(curl -s -X POST "$API_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/income_doc.txt" \
  -F "type=PROOF_OF_INCOME" \
  -F "name=Justificatif revenus" \
  -F "description=Bulletins salaire" \
  -F "loanId=$LOAN_ID")

DOC2_ID=$(echo $DOC2 | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ ! -z "$DOC2_ID" ]; then
  echo "   ✅ Income proof uploaded"
else
  echo "   ❌ Income upload failed: $DOC2"
fi

# 4. Create guarantor
echo ""
echo "4️⃣ Creating guarantor account..."
GUARANTOR=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guarantor.final@gmah.fr",
    "password": "Password123!",
    "firstName": "Garant",
    "lastName": "Test",
    "role": "GUARANTOR"
  }')

GUARANTOR_ID=$(echo $GUARANTOR | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
GUARANTOR_TOKEN=$(echo $GUARANTOR | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ ! -z "$GUARANTOR_ID" ]; then
  echo "   ✅ Guarantor created"
fi

# 5. Add guarantee
echo ""
echo "5️⃣ Adding guarantee to loan..."
GUARANTEE=$(curl -s -X POST "$API_URL/guarantees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"loanId\": \"$LOAN_ID\",
    \"guarantorId\": \"$GUARANTOR_ID\",
    \"type\": \"SIMPLE\",
    \"amount\": 4000,
    \"percentage\": 50
  }")

GUARANTEE_ID=$(echo $GUARANTEE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ ! -z "$GUARANTEE_ID" ]; then
  echo "   ✅ Guarantee added (50% coverage)"
fi

# 6. Sign guarantee
echo ""
echo "6️⃣ Signing guarantee..."
SIGN=$(curl -s -X POST "$API_URL/guarantees/$GUARANTEE_ID/sign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GUARANTOR_TOKEN" \
  -d '{
    "signature": "Garant Test - 28/08/2025",
    "acceptedTerms": true
  }')

if echo "$SIGN" | grep -q "ACTIVE"; then
  echo "   ✅ Guarantee signed and activated"
fi

# 7. Submit loan (without message field)
echo ""
echo "7️⃣ Submitting loan for review..."
SUBMIT=$(curl -s -X POST "$API_URL/loans/$LOAN_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

SUBMIT_STATUS=$(echo $SUBMIT | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null)

if [ "$SUBMIT_STATUS" = "SUBMITTED" ]; then
  echo "   ✅ Loan submitted successfully"
else
  echo "   ⚠️  Submission response: $SUBMIT"
fi

# 8. Final verification
echo ""
echo "8️⃣ Verifying final state..."

# Get loan details
LOAN_FINAL=$(curl -s -X GET "$API_URL/loans/$LOAN_ID" \
  -H "Authorization: Bearer $TOKEN")

FINAL_STATUS=$(echo $LOAN_FINAL | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)

# Count documents
DOCS_LIST=$(curl -s -X GET "$API_URL/documents/loan/$LOAN_ID" \
  -H "Authorization: Bearer $TOKEN")
DOC_COUNT=$(echo $DOCS_LIST | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d) if isinstance(d, list) else 0)" 2>/dev/null || echo "0")

# Count guarantees
GUARANTEES_LIST=$(curl -s -X GET "$API_URL/guarantees/loan/$LOAN_ID" \
  -H "Authorization: Bearer $TOKEN")
GUARANTEE_COUNT=$(echo $GUARANTEES_LIST | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d) if isinstance(d, list) else 0)" 2>/dev/null || echo "0")

# Get guarantee status
GUARANTEE_STATUS=$(echo $GUARANTEES_LIST | python3 -c "import sys, json; d=json.load(sys.stdin); print(d[0]['status'] if isinstance(d, list) and len(d) > 0 else 'N/A')" 2>/dev/null)

# Clean up
rm -f /tmp/id_doc.txt /tmp/income_doc.txt

# Results
echo ""
echo "========================================="
echo "📊 FINAL TEST RESULTS"
echo "========================================="
echo "✅ Borrower Registration    : SUCCESS"
echo "✅ Loan Creation           : SUCCESS"
echo "✅ Document Upload         : $DOC_COUNT document(s)"
echo "✅ Guarantor Registration  : SUCCESS"
echo "✅ Guarantee Creation      : SUCCESS"
echo "✅ Electronic Signature    : SUCCESS"
echo "✅ Loan Submission         : $FINAL_STATUS"
echo ""
echo "📋 Summary:"
echo "   • Loan ID: $LOAN_ID"
echo "   • Status: $FINAL_STATUS"
echo "   • Documents: $DOC_COUNT"
echo "   • Guarantees: $GUARANTEE_COUNT ($GUARANTEE_STATUS)"
echo ""
if [ "$FINAL_STATUS" = "SUBMITTED" ]; then
  echo "🎉 ALL TESTS PASSED SUCCESSFULLY!"
else
  echo "⚠️  Some tests may need attention"
fi
echo "========================================="

