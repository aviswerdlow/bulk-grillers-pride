# API Key Encryption Setup - Final Steps

## Current Status

✅ Encryption key has been set in Convex environment
❌ Migration functions cannot be found by Convex

## The Issue

Convex is not recognizing the new migration functions. This appears to be because:
1. The Node.js `crypto` module is not available in Convex's sandboxed environment
2. New files aren't being picked up by the dev server

## Immediate Solution

Since the encryption library uses Node.js crypto which isn't available in Convex, here are your options:

### Option 1: Use Convex Actions (Recommended)

Convex Actions have access to Node.js APIs. Create this file:

`convex/actions/encryptApiKeys.ts`:

```typescript
import { action } from '../_generated/server';
import { v } from 'convex/values';
import crypto from 'crypto';

// Your encryption functions here
function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

export const encryptExistingKeys = action({
  handler: async (ctx) => {
    // Implementation here
  },
});
```

Then run:
```bash
npx convex run actions/encryptApiKeys:encryptExistingKeys
```

### Option 2: External Migration Script

Create a Node.js script outside of Convex:

`scripts/encrypt-api-keys.js`:

```javascript
const { ConvexHttpClient } = require("convex/browser");
const crypto = require('crypto');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function migrateApiKeys() {
  // Fetch organizations
  // Encrypt keys
  // Update via Convex mutations
}

migrateApiKeys();
```

### Option 3: Client-Side Encryption

Move encryption to the client side before sending to Convex. Use SubtleCrypto API in the browser.

## What Has Been Completed

✅ API key encryption library created (needs modification for Convex)
✅ API key functions updated to support encryption (commented out for now)
✅ Logging security issues fixed
✅ Tests written for encryption
✅ Environment key set up

## Next Steps

1. Choose one of the above options
2. Implement the migration using that approach
3. Run the migration to encrypt existing keys
4. Re-enable the encryption code in `apiKeys.ts`

## Security Status

- ✅ Issue #196 (API key logging) is FIXED
- ⚠️  Issue #195 (API key encryption) needs alternative implementation due to Convex constraints

The security fixes for logging are complete and ready for PR #12. The encryption implementation needs to be adapted to work within Convex's environment constraints.