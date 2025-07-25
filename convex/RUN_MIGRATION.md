# Running the API Key Encryption Migration

## Prerequisites

1. **Start Convex Dev Server** (in a separate terminal):
   ```bash
   cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
   npx convex dev
   ```
   
   Wait until you see: "✔ Functions ready!"

## Steps to Complete

Since you've already set the encryption key, you just need to:

### 1. Run the migration (from project root):

```bash
npx convex run migrations:encryptExistingApiKeys
```

### 2. Verify encryption status:

```bash
npx convex run migrations:verifyApiKeyEncryption
```

## Expected Output

The migration should show:
- Number of organizations processed
- Number of keys encrypted
- Any keys that were already encrypted
- Any errors encountered

The verification should show:
- Total number of API keys
- Number of encrypted keys
- Whether all keys are encrypted

## Troubleshooting

If you get "Could not find function" error:
1. Make sure `npx convex dev` is running
2. Wait for "Functions ready!" message
3. Try the command again

If you get decryption errors later:
1. Check that ENCRYPTION_KEY is set in both .env.local and Convex
2. Make sure the key is exactly: `2617246d8ff66bdd86279a9ff0d931b6ea37b2e7504be14782e9e58d328aa907`