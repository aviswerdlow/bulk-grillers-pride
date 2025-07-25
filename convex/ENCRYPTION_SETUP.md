# API Key Encryption Setup Guide

## Overview

API keys are now encrypted at rest using AES-256-GCM encryption. This guide explains how to set up encryption for your environment.

## Generate Encryption Key

1. Run the following Node.js script to generate a secure encryption key:

```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY=' + key);
```

2. Save this key securely - you'll need it for all environments where the app runs.

## Environment Setup

### Development

Add to your `.env.local` file:
```
ENCRYPTION_KEY=your-64-character-hex-key-here
```

### Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `ENCRYPTION_KEY` with your generated key
4. Make sure it's available for all environments that need it

### Convex Environment

Set the encryption key in Convex:
```bash
npx convex env set ENCRYPTION_KEY your-64-character-hex-key-here
```

## Migration

After setting up the encryption key, run the migration to encrypt existing API keys:

```bash
npx convex run migrations:encryptExistingApiKeys
```

To verify all keys are encrypted:
```bash
npx convex run migrations:verifyApiKeyEncryption
```

## Security Notes

1. **Never commit the encryption key** to version control
2. **Use different keys** for different environments (dev, staging, prod)
3. **Backup the key securely** - losing it means losing access to encrypted data
4. **Rotate keys periodically** as part of security best practices

## Key Rotation (Future)

To rotate encryption keys:
1. Generate a new key
2. Set both old and new keys in environment (ENCRYPTION_KEY and ENCRYPTION_KEY_OLD)
3. Run migration to re-encrypt with new key
4. Remove old key after verification

## Troubleshooting

If you see decryption errors:
1. Check that ENCRYPTION_KEY is set correctly
2. Verify the key is exactly 64 hexadecimal characters
3. Ensure the same key is used that encrypted the data
4. Check if dealing with legacy unencrypted keys (migration handles these)