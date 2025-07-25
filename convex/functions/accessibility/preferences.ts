import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import {
  getAccessibilityPreferencesHandler,
  updateAccessibilityPreferencesHandler,
  getPreferencesByUserIdHandler,
} from './preferences.handlers';

// Get current user's accessibility preferences
export const getAccessibilityPreferences = query({
  handler: getAccessibilityPreferencesHandler,
});

// Update current user's accessibility preferences
export const updateAccessibilityPreferences = mutation({
  args: {
    preferences: v.object({
      reducedMotion: v.boolean(),
      highContrast: v.boolean(),
      screenReaderActive: v.boolean(),
      keyboardNavigation: v.boolean(),
      preferredConfirmationMethod: v.string(),
      focusIndicatorStyle: v.string(),
      announcementVerbosity: v.string(),
    }),
  },
  handler: updateAccessibilityPreferencesHandler,
});

// Get preferences by user ID (for admin/support use)
export const getPreferencesByUserId = query({
  args: { userId: v.id('users') },
  handler: getPreferencesByUserIdHandler,
});

// Get default accessibility preferences
export const getDefaultPreferences = query({
  handler: async () => {
    return {
      reducedMotion: false,
      highContrast: false,
      screenReaderActive: false,
      keyboardNavigation: false,
      preferredConfirmationMethod: 'standard_click',
      focusIndicatorStyle: 'default',
      announcementVerbosity: 'standard',
    };
  },
});