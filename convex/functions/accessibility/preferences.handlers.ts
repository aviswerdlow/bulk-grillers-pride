import { MutationCtx, QueryCtx } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import {
  UserAccessibilityPreferences,
  ConfirmationMethod,
  FocusIndicatorStyle,
  AnnouncementVerbosity,
} from '../../types/accessibility';

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  reducedMotion: false,
  highContrast: false,
  screenReaderActive: false,
  keyboardNavigation: false,
  preferredConfirmationMethod: 'standard_click' as const,
  focusIndicatorStyle: 'default' as const,
  announcementVerbosity: 'standard' as const,
};

// Get accessibility preferences for current user
export async function getAccessibilityPreferencesHandler(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Get the user record
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    return null;
  }

  // Get preferences for the user
  const preferences = await ctx.db
    .query('accessibilityPreferences')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique();

  // Return preferences or defaults if not set
  if (!preferences) {
    return {
      userId: user._id,
      preferences: DEFAULT_PREFERENCES,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  return preferences;
}

// Update accessibility preferences
export async function updateAccessibilityPreferencesHandler(
  ctx: MutationCtx,
  args: {
    preferences: {
      reducedMotion: boolean;
      highContrast: boolean;
      screenReaderActive: boolean;
      keyboardNavigation: boolean;
      preferredConfirmationMethod: string;
      focusIndicatorStyle: string;
      announcementVerbosity: string;
    };
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

  // Validate confirmation method
  const validConfirmationMethods = [
    'standard_click',
    'hold_to_confirm',
    'type_to_confirm',
    'biometric',
    'voice',
    'pattern_draw',
  ];
  if (!validConfirmationMethods.includes(args.preferences.preferredConfirmationMethod)) {
    throw new Error('Invalid confirmation method');
  }

  // Validate focus indicator style
  const validFocusStyles = ['default', 'high-visibility', 'custom'];
  if (!validFocusStyles.includes(args.preferences.focusIndicatorStyle)) {
    throw new Error('Invalid focus indicator style');
  }

  // Validate announcement verbosity
  const validVerbosityLevels = ['minimal', 'standard', 'verbose'];
  if (!validVerbosityLevels.includes(args.preferences.announcementVerbosity)) {
    throw new Error('Invalid announcement verbosity level');
  }

  // Check if preferences already exist
  const existingPreferences = await ctx.db
    .query('accessibilityPreferences')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique();

  const now = Date.now();

  if (existingPreferences) {
    // Update existing preferences
    await ctx.db.patch(existingPreferences._id, {
      preferences: args.preferences as any,
      updatedAt: now,
    });

    return existingPreferences._id;
  } else {
    // Create new preferences
    const id = await ctx.db.insert('accessibilityPreferences', {
      userId: user._id,
      preferences: args.preferences as any,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }
}

// Get preferences by user ID (for admin use)
export async function getPreferencesByUserIdHandler(
  ctx: QueryCtx,
  args: { userId: Id<'users'> }
) {
  const preferences = await ctx.db
    .query('accessibilityPreferences')
    .withIndex('by_user', (q) => q.eq('userId', args.userId))
    .unique();

  if (!preferences) {
    return {
      userId: args.userId,
      preferences: DEFAULT_PREFERENCES,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  return preferences;
}