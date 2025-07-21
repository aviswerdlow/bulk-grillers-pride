# Security Headers Configuration

This document outlines the security headers implemented in the Bulk Grillers Pride application.

## Implemented Headers

### 1. Strict-Transport-Security (HSTS)
```
max-age=63072000; includeSubDomains; preload
```
- Forces HTTPS connections for 2 years (63072000 seconds)
- Applies to all subdomains
- Eligible for browser preload lists

### 2. Content-Security-Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://*.clerk.com;
img-src 'self' data: blob: https:;
font-src 'self' data: https://*.clerk.com;
connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.com https://api.clerk.com https://clerk.com;
frame-src https://challenges.cloudflare.com https://*.clerk.com;
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
```

#### CSP Directives Explained:
- **default-src 'self'**: Only allow resources from the same origin by default
- **script-src**: Allows inline scripts (required for Next.js) and Clerk authentication
- **style-src**: Allows inline styles (required for Tailwind CSS) and Clerk styles
- **img-src**: Allows images from any HTTPS source, data URIs, and blob URLs
- **font-src**: Allows fonts from same origin and Clerk
- **connect-src**: Allows API connections to Convex and Clerk services
- **frame-src**: Allows Clerk authentication and Cloudflare challenges
- **frame-ancestors 'none'**: Prevents clickjacking attacks
- **object-src 'none'**: Disables plugins like Flash
- **base-uri 'self'**: Restricts base URL changes
- **form-action 'self'**: Forms can only submit to same origin

### 3. X-Content-Type-Options
```
nosniff
```
Prevents browsers from MIME-sniffing responses

### 4. X-Frame-Options
```
DENY
```
Prevents the page from being embedded in frames (clickjacking protection)

### 5. X-XSS-Protection
```
1; mode=block
```
Enables XSS filtering in older browsers

### 6. Referrer-Policy
```
strict-origin-when-cross-origin
```
Sends full URL when navigating within the same origin, only origin for cross-origin requests

### 7. Permissions-Policy
```
camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()
```
Disables access to sensitive browser features

## Testing

To verify headers are working:

1. **Browser DevTools**
   - Open Network tab
   - Load the application
   - Check response headers for any request

2. **Security Header Scanners**
   - [SecurityHeaders.com](https://securityheaders.com)
   - [Mozilla Observatory](https://observatory.mozilla.org)

3. **CSP Testing**
   - Monitor browser console for CSP violations
   - Ensure Clerk authentication works
   - Verify Convex real-time updates function
   - Test image uploads and displays

## Troubleshooting

### Common CSP Issues

1. **Clerk Authentication Failing**
   - Ensure `https://*.clerk.com` is in script-src and connect-src
   - Add `https://challenges.cloudflare.com` for bot protection

2. **Convex Real-time Updates Not Working**
   - Verify `wss://*.convex.cloud` is in connect-src
   - Check for WebSocket connection errors

3. **Inline Scripts/Styles Blocked**
   - 'unsafe-inline' is required for Next.js and Tailwind CSS
   - Consider implementing nonces in the future for better security

## Future Improvements

1. Replace 'unsafe-inline' with nonces for scripts and styles
2. Implement CSP reporting endpoint
3. Add Subresource Integrity (SRI) for external resources
4. Consider implementing Feature-Policy (now Permissions-Policy) more granularly