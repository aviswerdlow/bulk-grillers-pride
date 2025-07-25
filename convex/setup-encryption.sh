#!/bin/bash

# Setup script for API key encryption
# Run this from the project root directory

echo "🔐 Setting up API Key Encryption..."
echo ""

# The encryption key generated for this environment
ENCRYPTION_KEY="2617246d8ff66bdd86279a9ff0d931b6ea37b2e7504be14782e9e58d328aa907"

echo "Step 1: Setting encryption key in Convex environment..."
npx convex env set ENCRYPTION_KEY "$ENCRYPTION_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Encryption key set successfully"
else
    echo "❌ Failed to set encryption key. Please run manually:"
    echo "   npx convex env set ENCRYPTION_KEY $ENCRYPTION_KEY"
    exit 1
fi

echo ""
echo "Step 2: Deploying functions to Convex..."
echo "Please make sure 'npx convex dev' is running in another terminal, then press Enter to continue..."
read -r

echo ""
echo "Step 3: Running migration to encrypt existing API keys..."
npx convex run migrations:encryptExistingApiKeys

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed. Please check the logs and run manually:"
    echo "   npx convex run migrations:encryptExistingApiKeys"
    exit 1
fi

echo ""
echo "Step 4: Verifying encryption status..."
npx convex run migrations:verifyApiKeyEncryption

if [ $? -eq 0 ]; then
    echo "✅ Verification completed"
else
    echo "⚠️  Verification failed. Please run manually:"
    echo "   npx convex run migrations:verifyApiKeyEncryption"
fi

echo ""
echo "🎉 API Key encryption setup complete!"
echo ""
echo "⚠️  IMPORTANT: Save this encryption key securely:"
echo "   $ENCRYPTION_KEY"
echo ""
echo "You'll need it for:"
echo "- Other environments (staging, production)"
echo "- Disaster recovery"
echo "- Key rotation procedures"