import { MutationCtx, QueryCtx } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { nanoid } from 'nanoid';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Maximum focus history size
const MAX_FOCUS_HISTORY = 10;

// Rate limiting for confirmation attempts
const CONFIRMATION_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
};

// Security constants
const MAX_CONFIRMATION_ATTEMPTS = 10; // Total max attempts
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Helper function to sanitize input
function sanitizeInput(input: string): string {
  // Remove any potential XSS vectors
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[^\w\s-]/g, '') // Keep only alphanumeric, whitespace, and hyphens
    .trim()
    .substring(0, 100); // Limit length
}

// Helper function to validate nonce
function isValidNonce(nonce: string, validNonces: string[] = []): boolean {
  // Check if nonce exists and hasn't been used
  return nonce.length >= 16 && validNonces.includes(nonce);
}

// Helper function to generate a secure nonce
export function generateSecureNonce(): string {
  return nanoid(32);
}

// Create a new deletion session
export async function createDeletionSessionHandler(
  ctx: MutationCtx,
  args: {
    selectedProducts: Id<'products'>[];
    confirmationMethod: 
      | 'standard_click'
      | 'hold_to_confirm' 
      | 'type_to_confirm'
      | 'biometric'
      | 'voice'
      | 'pattern_draw';
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  // Get the user record
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    throw new Error('User not found');
  }

  // Get organization from the first product
  if (args.selectedProducts.length === 0) {
    throw new Error('No products selected');
  }

  const firstProductId = args.selectedProducts[0];
  if (!firstProductId) {
    throw new Error('No product ID found');
  }
  const firstProduct = await ctx.db.get(firstProductId);
  if (!firstProduct) {
    throw new Error('Product not found');
  }

  const organizationId = firstProduct.organizationId;

  // Generate unique session ID
  const sessionId = nanoid();
  const now = Date.now();

  // Generate initial nonce
  const initialNonce = generateSecureNonce();

  // Create the session
  await ctx.db.insert('deletionSessions', {
    sessionId,
    userId: user._id,
    organizationId,
    state: 'active',
    currentStep: 'review_consequences',
    selectedProducts: args.selectedProducts,
    confirmationMethod: args.confirmationMethod,
    focusHistory: [],
    confirmationAttempts: [],
    validNonces: [initialNonce],
    rateLimitWindowStart: now,
    startedAt: now,
    lastActivityAt: now,
  });

  return { sessionId, nonce: initialNonce };
}

// Update session focus state
export async function updateSessionFocusHandler(
  ctx: MutationCtx,
  args: {
    sessionId: string;
    focusState: {
      elementId: string;
      timestamp: number;
      context: 'modal' | 'wizard' | 'table' | 'form';
      scrollPosition?: { x: number; y: number };
      stepIndex?: number;
    };
  }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.state !== 'active') {
    throw new Error('Session is not active');
  }

  // Check session timeout
  const now = Date.now();
  if (now - session.lastActivityAt > SESSION_TIMEOUT) {
    // Mark session as cancelled due to timeout
    await ctx.db.patch(session._id, {
      state: 'cancelled',
      completedAt: now,
    });
    throw new Error('Session expired');
  }

  // Update focus history (limit to MAX_FOCUS_HISTORY entries)
  const focusHistory = [...session.focusHistory, args.focusState];
  if (focusHistory.length > MAX_FOCUS_HISTORY) {
    focusHistory.shift(); // Remove oldest entry
  }

  // Update session
  await ctx.db.patch(session._id, {
    focusHistory,
    lastActivityAt: now,
  });

  return { success: true };
}

// Validate alternative confirmation methods
export async function validateConfirmationHandler(
  ctx: MutationCtx,
  args: {
    sessionId: string;
    method: 
      | 'standard_click'
      | 'hold_to_confirm'
      | 'type_to_confirm'
      | 'biometric'
      | 'voice'
      | 'pattern_draw';
    data: {
      holdDuration?: number;
      typedText?: string;
      timestamp: number;
      nonce: string;
    };
  }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.state !== 'active') {
    throw new Error('Session is not active');
  }

  if (session.currentStep !== 'confirm') {
    throw new Error('Session not at confirmation step');
  }

  // Check session timeout
  const now = Date.now();
  if (now - session.lastActivityAt > SESSION_TIMEOUT) {
    await ctx.db.patch(session._id, {
      state: 'cancelled',
      completedAt: now,
    });
    throw new Error('Session expired');
  }

  // Get auth context for IP/user agent (would come from request headers in production)
  const identity = await ctx.auth.getUserIdentity();
  const ipAddress = 'pending-implementation'; // Would extract from request headers
  const userAgent = 'pending-implementation'; // Would extract from request headers

  // Check total attempt limit
  const totalAttempts = session.confirmationAttempts?.length || 0;
  if (totalAttempts >= MAX_CONFIRMATION_ATTEMPTS) {
    await ctx.db.patch(session._id, {
      state: 'cancelled',
      completedAt: now,
      lastActivityAt: now,
    });
    throw new Error('Maximum confirmation attempts exceeded. Session cancelled.');
  }

  // Validate nonce for CSRF protection
  if (!args.data.nonce || !isValidNonce(args.data.nonce, session.validNonces || [])) {
    // Record failed attempt
    const attempts = session.confirmationAttempts || [];
    attempts.push({
      timestamp: now,
      method: args.method,
      isValid: false,
      errorReason: 'Invalid or missing nonce',
      ipAddress,
      userAgent,
    });

    await ctx.db.patch(session._id, {
      confirmationAttempts: attempts,
      lastActivityAt: now,
    });

    throw new Error('Invalid security token. Please refresh and try again.');
  }

  // Check rate limiting
  const windowStart = session.rateLimitWindowStart || now;
  const windowAge = now - windowStart;
  
  // Count attempts in current window
  const recentAttempts = (session.confirmationAttempts || []).filter(
    attempt => attempt.timestamp >= windowStart
  ).length;

  // Reset window if expired
  if (windowAge > CONFIRMATION_RATE_LIMIT.windowMs) {
    await ctx.db.patch(session._id, {
      rateLimitWindowStart: now,
      confirmationAttempts: [], // Clear old attempts
    });
  } else if (recentAttempts >= CONFIRMATION_RATE_LIMIT.maxAttempts) {
    // Record rate limit violation
    const attempts = session.confirmationAttempts || [];
    attempts.push({
      timestamp: now,
      method: args.method,
      isValid: false,
      errorReason: 'Rate limit exceeded',
      ipAddress,
      userAgent,
    });

    await ctx.db.patch(session._id, {
      confirmationAttempts: attempts,
      lastActivityAt: now,
    });

    const remainingTime = Math.ceil((CONFIRMATION_RATE_LIMIT.windowMs - windowAge) / 1000);
    throw new Error(`Too many attempts. Please wait ${remainingTime} seconds before trying again.`);
  }

  // Validate based on method
  let isValid = false;
  let validationMessage = '';

  switch (args.method) {
    case 'hold_to_confirm':
      // Validate hold duration (minimum 3 seconds, maximum 30 seconds)
      if (args.data.holdDuration && args.data.holdDuration >= 3000 && args.data.holdDuration <= 30000) {
        isValid = true;
      } else {
        validationMessage = 'Hold duration must be between 3 and 30 seconds';
      }
      break;

    case 'type_to_confirm':
      // Sanitize and validate typed text
      if (args.data.typedText) {
        const sanitizedInput = sanitizeInput(args.data.typedText);
        const expectedText = `DELETE ${session.selectedProducts.length}`;
        const normalizedInput = sanitizedInput.toUpperCase();
        
        // Allow some flexibility (e.g., "DELETE 45" or "DELETE45")
        if (
          normalizedInput === expectedText ||
          normalizedInput === expectedText.replace(' ', '')
        ) {
          isValid = true;
        } else {
          validationMessage = `Please type "${expectedText}" to confirm`;
        }
      } else {
        validationMessage = 'Confirmation text is required';
      }
      break;

    case 'standard_click':
      // Basic validation for standard click
      isValid = true;
      break;

    case 'biometric':
    case 'voice':
    case 'pattern_draw':
      // These would require platform-specific validation
      // For now, we'll accept them as placeholders with warning
      isValid = false;
      validationMessage = 'This confirmation method is not yet implemented';
      break;

    default:
      validationMessage = 'Invalid confirmation method';
  }

  // Record the attempt
  const attempts = session.confirmationAttempts || [];
  const attemptRecord = {
    timestamp: now,
    method: args.method,
    isValid,
    errorReason: isValid ? undefined : validationMessage,
    ipAddress,
    userAgent,
  };
  attempts.push(attemptRecord);

  // Remove used nonce and generate new one for next attempt
  const validNonces = (session.validNonces || []).filter(n => n !== args.data.nonce);
  const newNonce = generateSecureNonce();
  validNonces.push(newNonce);

  // Clean up expired nonces (older than 5 minutes)
  const activeNonces = validNonces.slice(-5); // Keep only last 5 nonces

  // Update session
  await ctx.db.patch(session._id, {
    confirmationAttempts: attempts,
    validNonces: activeNonces,
    lastActivityAt: now,
  });

  // Get user information for audit log
  const user = await ctx.db.get(session.userId);
  
  // Enhanced audit logging
  if (isValid) {
    await ctx.db.insert('deletionAuditLogs', {
      organizationId: session.organizationId,
      projectId: undefined,
      operationType: 'bulk_delete',
      affectedProducts: [],
      totalCount: session.selectedProducts.length,
      breakdown: {
        uncategorized: 0,
        categorized: 0,
        byCategory: [],
      },
      performedBy: session.userId,
      performedAt: now,
      userEmail: user?.email || '',
      userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User',
      confirmationMethod: args.method,
      ipAddress,
      userAgent,
    });
  }

  return {
    isValid,
    message: validationMessage,
    newNonce, // Client needs this for next attempt
  };
}

// Get deletion session details
export async function getDeletionSessionHandler(
  ctx: QueryCtx,
  args: { sessionId: string }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    return null;
  }

  // Check if session has expired
  const now = Date.now();
  if (
    session.state === 'active' &&
    now - session.lastActivityAt > SESSION_TIMEOUT
  ) {
    return {
      ...session,
      state: 'cancelled' as const,
      isExpired: true,
    };
  }

  return session;
}

// Update session step
export async function updateSessionStepHandler(
  ctx: MutationCtx,
  args: {
    sessionId: string;
    step: 
      | 'review_consequences'
      | 'select_options'
      | 'confirm'
      | 'processing'
      | 'complete';
  }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.state !== 'active') {
    throw new Error('Session is not active');
  }

  const now = Date.now();

  // Check session timeout
  if (now - session.lastActivityAt > SESSION_TIMEOUT) {
    await ctx.db.patch(session._id, {
      state: 'cancelled',
      completedAt: now,
    });
    throw new Error('Session expired');
  }

  // Update session step
  await ctx.db.patch(session._id, {
    currentStep: args.step,
    lastActivityAt: now,
  });

  return { success: true };
}

// Complete deletion session
export async function completeDeletionSessionHandler(
  ctx: MutationCtx,
  args: { sessionId: string }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.state !== 'active') {
    throw new Error('Session is not active');
  }

  const now = Date.now();

  // Mark session as completed
  await ctx.db.patch(session._id, {
    state: 'completed',
    currentStep: 'complete',
    completedAt: now,
    lastActivityAt: now,
  });

  return { success: true };
}

// Cancel deletion session
export async function cancelDeletionSessionHandler(
  ctx: MutationCtx,
  args: { sessionId: string }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.state !== 'active') {
    throw new Error('Session is not active');
  }

  const now = Date.now();

  // Mark session as cancelled
  await ctx.db.patch(session._id, {
    state: 'cancelled',
    completedAt: now,
    lastActivityAt: now,
  });

  return { success: true };
}

// Get focus history for a session
export async function getSessionFocusHistoryHandler(
  ctx: QueryCtx,
  args: { sessionId: string }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    return null;
  }

  // Return focus history with session context
  return {
    sessionId: session.sessionId,
    currentStep: session.currentStep,
    focusHistory: session.focusHistory || [],
    lastFocus: session.focusHistory?.length 
      ? session.focusHistory[session.focusHistory.length - 1] 
      : null,
  };
}

// Clear focus history for a session
export async function clearSessionFocusHandler(
  ctx: MutationCtx,
  args: { sessionId: string }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  const now = Date.now();

  // Clear focus history
  await ctx.db.patch(session._id, {
    focusHistory: [],
    lastActivityAt: now,
  });

  return { success: true };
}

// Generate a new nonce for a session
export async function generateNewNonceHandler(
  ctx: MutationCtx,
  args: { sessionId: string }
) {
  const session = await ctx.db
    .query('deletionSessions')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .unique();

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.state !== 'active') {
    throw new Error('Session is not active');
  }

  const now = Date.now();

  // Check session timeout
  if (now - session.lastActivityAt > SESSION_TIMEOUT) {
    await ctx.db.patch(session._id, {
      state: 'cancelled',
      completedAt: now,
    });
    throw new Error('Session expired');
  }

  // Generate new nonce
  const newNonce = generateSecureNonce();
  const validNonces = (session.validNonces || []).slice(-4); // Keep last 4 nonces
  validNonces.push(newNonce);

  // Update session
  await ctx.db.patch(session._id, {
    validNonces,
    lastActivityAt: now,
  });

  return { nonce: newNonce };
}

// Cleanup expired sessions (to be run as a scheduled job)
export async function cleanupExpiredSessionsHandler(ctx: MutationCtx) {
  const now = Date.now();
  const expiryThreshold = now - SESSION_TIMEOUT;

  // Find all active sessions that have expired
  const expiredSessions = await ctx.db
    .query('deletionSessions')
    .withIndex('by_state', (q) => q.eq('state', 'active'))
    .filter((q) => q.lt(q.field('lastActivityAt'), expiryThreshold))
    .collect();

  // Mark them as cancelled
  for (const session of expiredSessions) {
    await ctx.db.patch(session._id, {
      state: 'cancelled',
      completedAt: now,
    });
  }

  return {
    cleanedUp: expiredSessions.length,
  };
}