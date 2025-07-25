# Run Migration Commands

The migration functions have been moved to the correct location. Try these commands now:

## 1. Run the encryption migration:

```bash
npx convex run functions.migrations.encryptApiKeys:encryptExistingApiKeys
```

## 2. Verify encryption status:

```bash
npx convex run functions.migrations.encryptApiKeys:verifyApiKeyEncryption
```

## Alternative: If the above doesn't work, try:

```bash
# With explicit path
npx convex run functions/migrations/encryptApiKeys:encryptExistingApiKeys
npx convex run functions/migrations/encryptApiKeys:verifyApiKeyEncryption
```

## Notes:
- Make sure `npx convex dev` is still running
- The functions should now be in the correct directory structure
- If you still get errors, try restarting `npx convex dev`