# Clerk JWT Template Configuration for Convex

This guide explains how to configure Clerk's JWT template to work with Convex authentication.

## Prerequisites

1. A Clerk application created at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Your Convex project deployed or running locally

## Steps to Configure JWT Template

### 1. Navigate to JWT Templates in Clerk Dashboard

1. Go to your Clerk Dashboard
2. Navigate to **Configure → JWT Templates**
3. Click on **New template** or edit the existing "convex" template

### 2. Configure the JWT Template

Set the following configuration:

**Template name**: `convex`

**Claims**: Add the following custom claims:

```json
{
  "aud": "convex",
  "sub": "{{user.id}}"
}
```

**Token lifetime**: 60 seconds (Convex will refresh automatically)

### 3. Update Convex Auth Configuration

The auth configuration is already set up in `convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL || 'https://discrete-marten-19.clerk.accounts.dev',
      applicationID: 'convex',
    },
  ],
};
```

### 4. Environment Variables

Ensure your `.env.local` file contains:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER_URL=https://discrete-marten-19.clerk.accounts.dev

# Optional: If using a custom domain
# CLERK_ISSUER_URL=https://your-custom-domain.clerk.accounts.dev
```

### 5. Update Convex Dashboard Settings

1. Go to your Convex Dashboard
2. Navigate to **Settings → Authentication**
3. Add Clerk as an auth provider with:
   - Domain: Your Clerk issuer URL (e.g., `https://discrete-marten-19.clerk.accounts.dev`)
   - Application ID: `convex`

## Verifying the Configuration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. In another terminal, run Convex:

   ```bash
   npx convex dev
   ```

3. Try signing in through your application
4. Check the Convex dashboard logs for any authentication errors

## Common Issues

### "Invalid token" Error

- Ensure the JWT template name matches the `applicationID` in `auth.config.ts`
- Verify the audience claim is set to "convex"

### "Token expired" Error

- This is normal - Convex will automatically refresh tokens
- If persistent, check your system clock is synchronized

### "User not found" Error

- Ensure the `sub` claim is set to `{{user.id}}`
- Check that the user exists in your Clerk dashboard

## Additional JWT Claims (Optional)

You can add more claims to pass user information to Convex:

```json
{
  "aud": "convex",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "given_name": "{{user.first_name}}",
  "family_name": "{{user.last_name}}",
  "picture": "{{user.image_url}}"
}
```

These additional claims will be available in `ctx.auth.getUserIdentity()` within your Convex functions.

## Resources

- [Clerk JWT Templates Documentation](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Convex Authentication Documentation](https://docs.convex.dev/auth)
- [Convex + Clerk Integration Guide](https://docs.convex.dev/auth/clerk)
