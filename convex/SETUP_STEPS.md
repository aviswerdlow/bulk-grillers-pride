# API Key Encryption Setup Steps

## Quick Setup (Recommended)

Run this from your project root directory:
```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
./convex/setup-encryption.sh
```

## Manual Setup

If the script doesn't work, run these commands manually from your project root:

### 1. Set the encryption key in Convex

```bash
npx convex env set ENCRYPTION_KEY 2617246d8ff66bdd86279a9ff0d931b6ea37b2e7504be14782e9e58d328aa907
```

### 2. Run the migration to encrypt existing keys

```bash
npx convex run migrations:encryptExistingApiKeys
```

### 3. Verify all keys are encrypted

```bash
npx convex run migrations:verifyApiKeyEncryption
```

## Important Notes

⚠️ **SAVE THIS ENCRYPTION KEY SECURELY:**
```
2617246d8ff66bdd86279a9ff0d931b6ea37b2e7504be14782e9e58d328aa907
```

You'll need this key for:
- Setting up other environments (staging, production)
- Disaster recovery
- Future key rotation

## For Production

1. Generate a different encryption key for production:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Set it in your production Convex environment:
   ```bash
   npx convex env set ENCRYPTION_KEY <your-production-key> --prod
   ```

3. Run the migration in production:
   ```bash
   npx convex run migrations:encryptExistingApiKeys --prod
   ```

## Troubleshooting

If you see decryption errors after setup:
1. Make sure the ENCRYPTION_KEY is set correctly
2. Check if you have any legacy unencrypted keys (the migration should handle these)
3. Verify the key is exactly 64 hexadecimal characters

## Testing

After setup, test that API keys work correctly:
1. Try updating an API key through your application
2. Verify AI categorization still works
3. Check that masked API keys display correctly in the UI