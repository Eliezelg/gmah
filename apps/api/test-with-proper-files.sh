#!/bin/bash

API_URL="http://localhost:3333/api"

echo "========================================="
echo "✅ GMAH Platform - Test with proper files"
echo "========================================="
echo ""

# Login as existing user
echo "1️⃣ Login as existing borrower..."
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "final.test@gmah.fr",
    "password": "Password123!"
  }')

TOKEN=$(echo $LOGIN | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ ! -z "$TOKEN" ]; then
  echo "   ✅ Logged in successfully"
fi

# Get the existing loan
LOAN_ID="cmevpiqri000zu7h8cfhc4u3k"
echo ""
echo "2️⃣ Using existing loan: $LOAN_ID"

# Create a simple PDF-like file (with PDF header)
echo ""
echo "3️⃣ Creating test PDF files..."
printf "%%PDF-1.4\n1 0 obj\n<< >>\nendobj\nxref\n0 0\ntrailer\n<< >>\n%%EOF" > /tmp/test_id.pdf
printf "%%PDF-1.4\n1 0 obj\n<< >>\nendobj\nxref\n0 0\ntrailer\n<< >>\n%%EOF" > /tmp/test_income.pdf

echo "   ✅ Created test PDF files"

# Upload as PDF
echo ""
echo "4️⃣ Uploading PDF documents..."
DOC1=$(curl -s -X POST "$API_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_id.pdf;type=application/pdf" \
  -F "type=ID_CARD" \
  -F "name=Carte identité PDF" \
  -F "description=Document identité" \
  -F "loanId=$LOAN_ID")

if echo "$DOC1" | grep -q '"id"'; then
  echo "   ✅ ID document uploaded as PDF"
else
  echo "   ❌ Upload failed: $DOC1"
fi

DOC2=$(curl -s -X POST "$API_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_income.pdf;type=application/pdf" \
  -F "type=PROOF_OF_INCOME" \
  -F "name=Justificatifs revenus PDF" \
  -F "description=Bulletins de salaire" \
  -F "loanId=$LOAN_ID")

if echo "$DOC2" | grep -q '"id"'; then
  echo "   ✅ Income proof uploaded as PDF"
else
  echo "   ❌ Upload failed: $DOC2"
fi

# Check documents count
echo ""
echo "5️⃣ Verifying documents..."
DOCS=$(curl -s -X GET "$API_URL/documents/loan/$LOAN_ID" \
  -H "Authorization: Bearer $TOKEN")

DOC_COUNT=$(echo $DOCS | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d) if isinstance(d, list) else 0)" 2>/dev/null || echo "0")
echo "   📄 Total documents: $DOC_COUNT"

# Try to submit loan again
echo ""
echo "6️⃣ Submitting loan with documents..."
SUBMIT=$(curl -s -X POST "$API_URL/loans/$LOAN_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

if echo "$SUBMIT" | grep -q "SUBMITTED"; then
  echo "   ✅ Loan submitted successfully!"
  STATUS="SUBMITTED"
else
  echo "   ⚠️  Submit response: $SUBMIT"
  STATUS=$(echo $SUBMIT | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'UNKNOWN'))" 2>/dev/null)
fi

# Clean up
rm -f /tmp/test_id.pdf /tmp/test_income.pdf

echo ""
echo "========================================="
echo "📊 RESULTS"
echo "========================================="
echo "• Loan ID: $LOAN_ID"
echo "• Documents uploaded: $DOC_COUNT"
echo "• Final status: $STATUS"
echo "========================================="

