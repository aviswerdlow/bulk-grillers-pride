import { v } from 'convex/values';
import { mutation, query, internalMutation } from '../../_generated/server';
import {
  createDeletionSessionHandler,
  updateSessionFocusHandler,
  validateConfirmationHandler,
  getDeletionSessionHandler,
  cleanupExpiredSessionsHandler,
  updateSessionStepHandler,
  completeDeletionSessionHandler,
  cancelDeletionSessionHandler,
  generateNewNonceHandler,
  getSessionFocusHistoryHandler,
  clearSessionFocusHandler,
} from './deletionSessions.handlers';

// Create a new deletion session
export const createDeletionSession = mutation({
  args: {
    selectedProducts: v.array(v.id('products')),
    confirmationMethod: v.union(
      v.literal('standard_click'),
      v.literal('hold_to_confirm'),
      v.literal('type_to_confirm'),
      v.literal('biometric'),
      v.literal('voice'),
      v.literal('pattern_draw')
    ),
  },
  handler: createDeletionSessionHandler,
  returns: v.object({
    sessionId: v.string(),
    nonce: v.string(),
  }),
});

// Update session focus state
export const updateSessionFocus = mutation({
  args: {
    sessionId: v.string(),
    focusState: v.object({
      elementId: v.string(),
      timestamp: v.number(),
      context: v.union(
        v.literal('modal'),
        v.literal('wizard'),
        v.literal('table'),
        v.literal('form')
      ),
      scrollPosition: v.optional(
        v.object({
          x: v.number(),
          y: v.number(),
        })
      ),
      stepIndex: v.optional(v.number()),
    }),
  },
  handler: updateSessionFocusHandler,
});

// Validate alternative confirmation methods
export const validateConfirmation = mutation({
  args: {
    sessionId: v.string(),
    method: v.union(
      v.literal('standard_click'),
      v.literal('hold_to_confirm'),
      v.literal('type_to_confirm'),
      v.literal('biometric'),
      v.literal('voice'),
      v.literal('pattern_draw')
    ),
    data: v.object({
      holdDuration: v.optional(v.number()),
      typedText: v.optional(v.string()),
      timestamp: v.number(),
      nonce: v.string(),
    }),
  },
  handler: validateConfirmationHandler,
  returns: v.object({
    isValid: v.boolean(),
    message: v.string(),
    newNonce: v.string(),
  }),
});

// Get deletion session details
export const getDeletionSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: getDeletionSessionHandler,
});

// Update session step
export const updateSessionStep = mutation({
  args: {
    sessionId: v.string(),
    step: v.union(
      v.literal('review_consequences'),
      v.literal('select_options'),
      v.literal('confirm'),
      v.literal('processing'),
      v.literal('complete')
    ),
  },
  handler: updateSessionStepHandler,
});

// Complete deletion session
export const completeDeletionSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: completeDeletionSessionHandler,
});

// Cancel deletion session
export const cancelDeletionSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: cancelDeletionSessionHandler,
});

// Generate a new nonce for a session
export const generateNewNonce = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: generateNewNonceHandler,
  returns: v.object({
    nonce: v.string(),
  }),
});

// Get focus history for a session
export const getSessionFocusHistory = query({
  args: {
    sessionId: v.string(),
  },
  handler: getSessionFocusHistoryHandler,
});

// Clear focus history for a session
export const clearSessionFocus = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: clearSessionFocusHandler,
});

// Cleanup expired sessions (scheduled job)
export const cleanupExpiredSessions: any = internalMutation({
  handler: cleanupExpiredSessionsHandler,
});