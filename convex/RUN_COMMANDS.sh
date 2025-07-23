#!/bin/bash

echo "Running API Key Encryption Migration..."
echo ""

# The correct format based on the help is dir/file:functionName
echo "1. Running encryption migration..."
npx convex run migrations/encryptApiKeys:encryptExistingApiKeys

echo ""
echo "2. Verifying encryption status..."
npx convex run migrations/encryptApiKeys:verifyApiKeyEncryption

echo ""
echo "Done!"