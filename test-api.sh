#!/bin/bash

API_URL="http://localhost:3333/api"

echo "🔐 Testing registration..."
curl -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123456!",
    "firstName": "Test",
    "lastName": "User",
    "role": "BORROWER"
  }' | python3 -m json.tool

