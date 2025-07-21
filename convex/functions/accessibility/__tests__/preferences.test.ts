import { convexTest } from '../../../__tests__/test-helpers';
import {
  getAccessibilityPreferencesHandler,
  updateAccessibilityPreferencesHandler,
  getPreferencesByUserIdHandler,
} from '../preferences.handlers';

describe('Accessibility Preferences', () => {
  let ctx: any;
  let userId: string;

  beforeEach(async () => {
    ctx = convexTest();

    // Create test user
    userId = await ctx.db.insert('users', {
      clerkId: 'user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  describe('getAccessibilityPreferences', () => {
    it('should return null when not authenticated', async () => {
      ctx.auth.getUserIdentity.mockResolvedValue(null);
      const result = await getAccessibilityPreferencesHandler(ctx);

      expect(result).toBeNull();
    });

    it('should return default preferences when user has no saved preferences', async () => {
      ctx.auth.getUserIdentity.mockResolvedValue({ subject: 'user_123' });
      const result = await getAccessibilityPreferencesHandler(ctx);

      expect(result).toMatchObject({
        userId,
        preferences: {
          reducedMotion: false,
          highContrast: false,
          screenReaderActive: false,
          keyboardNavigation: false,
          preferredConfirmationMethod: 'standard_click',
          focusIndicatorStyle: 'default',
          announcementVerbosity: 'standard',
        },
      });
    });

    it('should return saved preferences when they exist', async () => {
      // Create preferences
      await ctx.db.insert('accessibilityPreferences', {
        userId,
        preferences: {
          reducedMotion: true,
          highContrast: true,
          screenReaderActive: false,
          keyboardNavigation: true,
          preferredConfirmationMethod: 'type_to_confirm',
          focusIndicatorStyle: 'high-visibility',
          announcementVerbosity: 'verbose',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ctx.auth.getUserIdentity.mockResolvedValue({ subject: 'user_123' });
      const result = await getAccessibilityPreferencesHandler(ctx);

      expect(result?.preferences).toMatchObject({
        reducedMotion: true,
        highContrast: true,
        screenReaderActive: false,
        keyboardNavigation: true,
        preferredConfirmationMethod: 'type_to_confirm',
        focusIndicatorStyle: 'high-visibility',
        announcementVerbosity: 'verbose',
      });
    });
  });

  describe('updateAccessibilityPreferences', () => {
    it('should throw error when not authenticated', async () => {
      ctx.auth.getUserIdentity.mockResolvedValue(null);
      await expect(
        updateAccessibilityPreferencesHandler(
          ctx,
          {
            preferences: {
              reducedMotion: false,
              highContrast: false,
              screenReaderActive: false,
              keyboardNavigation: false,
              preferredConfirmationMethod: 'standard_click',
              focusIndicatorStyle: 'default',
              announcementVerbosity: 'standard',
            },
          }
        )
      ).rejects.toThrow('Not authenticated');
    });

    it('should validate confirmation method', async () => {
      ctx.auth.getUserIdentity.mockResolvedValue({ subject: 'user_123' });
      await expect(
        updateAccessibilityPreferencesHandler(
          ctx,
          {
            preferences: {
              reducedMotion: false,
              highContrast: false,
              screenReaderActive: false,
              keyboardNavigation: false,
              preferredConfirmationMethod: 'invalid_method',
              focusIndicatorStyle: 'default',
              announcementVerbosity: 'standard',
            },
          }
        )
      ).rejects.toThrow('Invalid confirmation method');
    });

    it('should create new preferences when none exist', async () => {
      ctx.auth.getUserIdentity.mockResolvedValue({ subject: 'user_123' });
      const preferenceId = await updateAccessibilityPreferencesHandler(
        ctx,
        {
          preferences: {
            reducedMotion: true,
            highContrast: false,
            screenReaderActive: true,
            keyboardNavigation: true,
            preferredConfirmationMethod: 'hold_to_confirm',
            focusIndicatorStyle: 'high-visibility',
            announcementVerbosity: 'minimal',
          },
        }
      );

      const savedPreferences = await ctx.db.get(preferenceId);
      expect(savedPreferences).toMatchObject({
        userId,
        preferences: {
          reducedMotion: true,
          highContrast: false,
          screenReaderActive: true,
          keyboardNavigation: true,
          preferredConfirmationMethod: 'hold_to_confirm',
          focusIndicatorStyle: 'high-visibility',
          announcementVerbosity: 'minimal',
        },
      });
    });

    it('should update existing preferences', async () => {
      // Create initial preferences
      const preferenceId = await ctx.db.insert('accessibilityPreferences', {
        userId,
        preferences: {
          reducedMotion: false,
          highContrast: false,
          screenReaderActive: false,
          keyboardNavigation: false,
          preferredConfirmationMethod: 'standard_click',
          focusIndicatorStyle: 'default',
          announcementVerbosity: 'standard',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update preferences
      ctx.auth.getUserIdentity.mockResolvedValue({ subject: 'user_123' });
      await updateAccessibilityPreferencesHandler(
        ctx,
        {
          preferences: {
            reducedMotion: true,
            highContrast: true,
            screenReaderActive: false,
            keyboardNavigation: true,
            preferredConfirmationMethod: 'type_to_confirm',
            focusIndicatorStyle: 'high-visibility',
            announcementVerbosity: 'verbose',
          },
        }
      );

      const updatedPreferences = await ctx.db.get(preferenceId);
      expect(updatedPreferences?.preferences).toMatchObject({
        reducedMotion: true,
        highContrast: true,
        screenReaderActive: false,
        keyboardNavigation: true,
        preferredConfirmationMethod: 'type_to_confirm',
        focusIndicatorStyle: 'high-visibility',
        announcementVerbosity: 'verbose',
      });
    });
  });

  describe('getPreferencesByUserId', () => {
    it('should return default preferences when user has no saved preferences', async () => {
      const result = await getPreferencesByUserIdHandler(
        ctx,
        { userId }
      );

      expect(result).toMatchObject({
        userId,
        preferences: {
          reducedMotion: false,
          highContrast: false,
          screenReaderActive: false,
          keyboardNavigation: false,
          preferredConfirmationMethod: 'standard_click',
          focusIndicatorStyle: 'default',
          announcementVerbosity: 'standard',
        },
      });
    });

    it('should return saved preferences when they exist', async () => {
      // Create preferences
      await ctx.db.insert('accessibilityPreferences', {
        userId,
        preferences: {
          reducedMotion: true,
          highContrast: true,
          screenReaderActive: true,
          keyboardNavigation: true,
          preferredConfirmationMethod: 'biometric',
          focusIndicatorStyle: 'custom',
          announcementVerbosity: 'minimal',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await getPreferencesByUserIdHandler(
        ctx,
        { userId }
      );

      expect(result?.preferences).toMatchObject({
        reducedMotion: true,
        highContrast: true,
        screenReaderActive: true,
        keyboardNavigation: true,
        preferredConfirmationMethod: 'biometric',
        focusIndicatorStyle: 'custom',
        announcementVerbosity: 'minimal',
      });
    });
  });
});