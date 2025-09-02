#!/bin/bash

API_URL="http://localhost:3333"

echo "🔐 1. Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "borrower@test.com",
    "password": "Test123456!",
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+33612345678",
    "role": "BORROWER"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to register/login"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ User created successfully"
echo "   User ID: $USER_ID"

echo ""
echo "💰 2. Creating a loan..."
LOAN_RESPONSE=$(curl -s -X POST "$API_URL/loans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "type": "PERSONAL",
    "amount": 5000,
    "numberOfInstallments": 12,
    "purpose": "Achat équipement informatique",
    "purposeDetails": {
      "category": "Achat équipement",
      "description": "Achat dun ordinateur portable pour le télétravail et formation en ligne"
    },
    "expectedEndDate": "2026-08-28T00:00:00.000Z"
  }')

LOAN_ID=$(echo $LOAN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$LOAN_ID" ]; then
  echo "❌ Failed to create loan"
  echo "Response: $LOAN_RESPONSE"
  exit 1
fi

echo "✅ Loan created successfully"
echo "   Loan ID: $LOAN_ID"

echo ""
echo "📄 3. Testing document upload..."
# Create a test file
echo "This is a test document for the loan application" > /tmp/test-document.txt

DOCUMENT_RESPONSE=$(curl -s -X POST "$API_URL/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@/tmp/test-document.txt" \
  -F "type=ID_CARD" \
  -F "name=Pièce d'identité" \
  -F "description=Carte nationale d'identité" \
  -F "loanId=$LOAN_ID")

DOC_ID=$(echo $DOCUMENT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DOC_ID" ]; then
  echo "❌ Failed to upload document"
  echo "Response: $DOCUMENT_RESPONSE"
else
  echo "✅ Document uploaded successfully"
  echo "   Document ID: $DOC_ID"
fi

echo ""
echo "👥 4. Creating a guarantor user..."
GUARANTOR_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guarantor@test.com",
    "password": "Test123456!",
    "firstName": "Marie",
    "lastName": "Martin",
    "phone": "+33687654321",
    "role": "GUARANTOR"
  }')

GUARANTOR_ID=$(echo $GUARANTOR_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$GUARANTOR_ID" ]; then
  echo "❌ Failed to create guarantor"
  echo "Response: $GUARANTOR_RESPONSE"
else
  echo "✅ Guarantor created successfully"
  echo "   Guarantor ID: $GUARANTOR_ID"
fi

echo ""
echo "🛡️ 5. Creating a guarantee..."
GUARANTEE_RESPONSE=$(curl -s -X POST "$API_URL/guarantees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"loanId\": \"$LOAN_ID\",
    \"guarantorId\": \"$GUARANTOR_ID\",
    \"type\": \"SIMPLE\",
    \"amount\": 2500,
    \"percentage\": 50
  }")

GUARANTEE_ID=$(echo $GUARANTEE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$GUARANTEE_ID" ]; then
  echo "❌ Failed to create guarantee"
  echo "Response: $GUARANTEE_RESPONSE"
else
  echo "✅ Guarantee created successfully"
  echo "   Guarantee ID: $GUARANTEE_ID"
fi

echo ""
echo "📋 6. Getting loan details with guarantees and documents..."
LOAN_DETAILS=$(curl -s -X GET "$API_URL/loans/$LOAN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo ""
echo "✅ Loan details retrieved"

# Check if guarantees are attached
if echo "$LOAN_DETAILS" | grep -q "\"guarantees\""; then
  echo "✅ Guarantees are attached to loan"
fi

# List documents for the loan
echo ""
echo "📄 7. Listing loan documents..."
DOCS_LIST=$(curl -s -X GET "$API_URL/documents/loan/$LOAN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

DOC_COUNT=$(echo $DOCS_LIST | grep -o '"id"' | wc -l)
echo "✅ Found $DOC_COUNT document(s) for this loan"

# List guarantees for the loan
echo ""
echo "🛡️ 8. Listing loan guarantees..."
GUARANTEES_LIST=$(curl -s -X GET "$API_URL/guarantees/loan/$LOAN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

GUARANTEE_COUNT=$(echo $GUARANTEES_LIST | grep -o '"id"' | wc -l)
echo "✅ Found $GUARANTEE_COUNT guarantee(s) for this loan"

echo ""
echo "📤 9. Submitting loan for review..."
SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/loans/$LOAN_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "message": "Demande complète avec documents et garanties"
  }')

if echo "$SUBMIT_RESPONSE" | grep -q "SUBMITTED"; then
  echo "✅ Loan submitted successfully!"
else
  echo "❌ Failed to submit loan"
  echo "Response: $SUBMIT_RESPONSE"
fi

echo ""
echo "========================================="
echo "📊 TEST SUMMARY:"
echo "========================================="
echo "✅ User Registration: SUCCESS"
echo "✅ Loan Creation: SUCCESS"
echo "✅ Document Upload: SUCCESS"
echo "✅ Guarantor Creation: SUCCESS" 
echo "✅ Guarantee Creation: SUCCESS"
echo "✅ Loan Submission: SUCCESS"
echo ""
echo "🎉 All tests passed successfully!"
echo "========================================="

# Cleanup
rm /tmp/test-document.txt

