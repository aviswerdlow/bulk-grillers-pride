# Accessibility Backend Infrastructure

This module implements the backend infrastructure for managing user accessibility preferences and deletion session state management as specified in Issue #71.

## Overview

The accessibility backend provides:
- User accessibility preferences management
- Deletion session state tracking with focus history
- Alternative confirmation method validation
- Automatic session cleanup for expired sessions

## Architecture

The implementation follows the design specified in `/docs/architecture/accessibility-deletion-flow.md`.

### Components

1. **Preferences Management** (`preferences.ts`, `preferences.handlers.ts`)
   - Get/update user accessibility preferences
   - Support for reduced motion, high contrast, screen reader settings
   - Configurable confirmation methods and focus indicators

2. **Deletion Sessions** (`deletionSessions.ts`, `deletionSessions.handlers.ts`)
   - Track multi-step deletion workflow state
   - Maintain focus history for accessibility
   - Support alternative confirmation methods
   - Automatic session expiry (30 minutes)

3. **Types** (`../../types/accessibility.ts`)
   - TypeScript interfaces for all accessibility data structures
   - Enums for confirmation methods, severity levels, etc.

## API Endpoints

### Preferences

- `getAccessibilityPreferences`: Get current user's preferences
- `updateAccessibilityPreferences`: Update user preferences
- `getPreferencesByUserId`: Admin endpoint to get any user's preferences

### Deletion Sessions

- `createDeletionSession`: Start a new deletion workflow
- `updateSessionFocus`: Track focus state changes
- `validateConfirmation`: Validate alternative confirmation methods
- `getDeletionSession`: Get session details
- `updateSessionStep`: Progress through deletion steps
- `completeDeletionSession`: Mark session as completed
- `cancelDeletionSession`: Cancel an active session
- `cleanupExpiredSessions`: Scheduled job to clean expired sessions

## Confirmation Methods

The system supports multiple confirmation methods for accessibility:

1. **Standard Click**: Basic button click
2. **Hold to Confirm**: Hold button for 3+ seconds
3. **Type to Confirm**: Type "DELETE X" where X is the number of items
4. **Biometric**: Placeholder for future biometric authentication
5. **Voice**: Placeholder for future voice confirmation
6. **Pattern Draw**: Placeholder for future pattern-based confirmation

## Session Management

- Sessions expire after 30 minutes of inactivity
- Focus history is maintained (last 10 entries)
- Sessions are automatically cleaned up by a scheduled job
- All session operations are audited in `deletionAuditLogs`

## Testing

The module includes comprehensive unit tests:
- `__tests__/preferences.test.ts`: Tests for preference management
- `__tests__/deletionSessions.test.ts`: Tests for session management

Run tests with:
```bash
npm test -- functions/accessibility/__tests__/
```

## Security Considerations

- All endpoints require authentication
- Session operations are validated against the owning user
- Confirmation attempts are logged for audit purposes
- Rate limiting should be implemented for confirmation validation

## Future Enhancements

- Implement biometric, voice, and pattern confirmation methods
- Add rate limiting for confirmation attempts
- Enhance audit logging with more detailed context
- Add analytics for accessibility feature usage