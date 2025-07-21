import { convexTest } from '../../../__tests__/test-helpers';
import {
  createDeletionSessionHandler,
  updateSessionFocusHandler,
  validateConfirmationHandler,
  getDeletionSessionHandler,
  updateSessionStepHandler,
  completeDeletionSessionHandler,
  cancelDeletionSessionHandler,
  cleanupExpiredSessionsHandler,
  generateNewNonceHandler,
  generateSecureNonce,
} from '../deletionSessions.handlers';

describe('Deletion Sessions', () => {
  let ctx: any;
  let userId: string;
  let organizationId: string;
  let projectId: string;
  let productIds: string[];

  beforeEach(async () => {
    ctx = convexTest();

    // Create test organization
    organizationId = await ctx.db.insert('organizations', {
      name: 'Test Org',
      slug: 'test-org',
      status: 'active',
      subscription: {
        plan: 'pro',
        status: 'active',
        seats: 10,
        features: ['ai-categorization'],
      },
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        apiKeys: {
          openai: 'sk-test-key',
        },
        categorization: {
          batchSize: 50,
          prompt: 'Categorize this product',
          autoApprove: false,
          confidenceThreshold: 0.8,
        },
        storage: {
          maxFileSize: 10485760,
          totalStorageLimit: 104857600,
          allowedFileTypes: ['image/jpeg', 'image/png'],
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

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

    // Create test project
    projectId = await ctx.db.insert('projects', {
      organizationId,
      name: 'Test Project',
      slug: 'test-project',
      status: 'active',
      settings: {
        defaultCurrency: 'USD',
        importSettings: {
          autoValidate: true,
          duplicateHandling: 'skip',
          requiredFields: ['title', 'sku'],
        },
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    // Create test products
    productIds = [];
    for (let i = 0; i < 3; i++) {
      const productId = await ctx.db.insert('products', {
        organizationId,
        projectId,
        title: `Product ${i + 1}`,
        handle: `product-${i + 1}`,
        sku: `SKU-${i + 1}`,
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        metadata: {},
        version: 1,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: userId,
      });
      productIds.push(productId);
    }

    // Mock auth to return our test user
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: 'user_123' });
  });

  describe('createDeletionSession', () => {
    it('should create a new deletion session with security fields', async () => {
      const result = await createDeletionSessionHandler(
        ctx,
        {
          selectedProducts: productIds,
          confirmationMethod: 'type_to_confirm',
        }
      );

      expect(result.sessionId).toBeTruthy();
      expect(result.nonce).toBeTruthy();
      expect(result.nonce.length).toBeGreaterThanOrEqual(32);

      // Verify session was created with security fields
      const sessions = await ctx.db.query('deletionSessions').collect();
      const session = sessions.find((s: any) => s.sessionId === result.sessionId);

      expect(session).toMatchObject({
        sessionId: result.sessionId,
        userId,
        organizationId,
        state: 'active',
        currentStep: 'review_consequences',
        selectedProducts: productIds,
        confirmationMethod: 'type_to_confirm',
        focusHistory: [],
        confirmationAttempts: [],
      });
      expect(session.validNonces).toContain(result.nonce);
      expect(session.rateLimitWindowStart).toBeTruthy();
    });

    it('should throw error when not authenticated', async () => {
      ctx.auth.getUserIdentity.mockResolvedValue(null);
      
      await expect(
        createDeletionSessionHandler(
          ctx,
          {
            selectedProducts: productIds,
            confirmationMethod: 'standard_click',
          }
        )
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw error when no products selected', async () => {
      await expect(
        createDeletionSessionHandler(
          ctx,
          {
            selectedProducts: [],
            confirmationMethod: 'standard_click',
          }
        )
      ).rejects.toThrow('No products selected');
    });
  });

  describe('updateSessionFocus', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session
      const result = await createDeletionSessionHandler(
        ctx,
        {
          selectedProducts: productIds,
          confirmationMethod: 'standard_click',
        }
      );
      sessionId = result.sessionId;
    });

    it('should update focus history', async () => {
      const focusState = {
        elementId: 'delete-button',
        timestamp: Date.now(),
        context: 'modal' as const,
        scrollPosition: { x: 0, y: 100 },
      };

      await updateSessionFocusHandler(
        ctx,
        { sessionId, focusState }
      );

      const sessions = await ctx.db.query('deletionSessions').collect();
      const session = sessions.find((s: any) => s.sessionId === sessionId);

      expect(session?.focusHistory).toHaveLength(1);
      expect(session?.focusHistory[0]).toMatchObject(focusState);
    });

    it('should update focus history with stepIndex', async () => {
      const focusState = {
        elementId: 'confirm-button',
        timestamp: Date.now(),
        context: 'wizard' as const,
        scrollPosition: { x: 0, y: 200 },
        stepIndex: 2,
      };

      await updateSessionFocusHandler(
        ctx,
        { sessionId, focusState }
      );

      const sessions = await ctx.db.query('deletionSessions').collect();
      const session = sessions.find((s: any) => s.sessionId === sessionId);

      expect(session?.focusHistory).toHaveLength(1);
      expect(session?.focusHistory[0]).toMatchObject(focusState);
      expect(session?.focusHistory[0].stepIndex).toBe(2);
    });

    it('should limit focus history to 10 entries', async () => {
      // Add 15 focus states
      for (let i = 0; i < 15; i++) {
        await updateSessionFocusHandler(
          ctx,
          {
            sessionId,
            focusState: {
              elementId: `element-${i}`,
              timestamp: Date.now() + i,
              context: 'modal',
            },
          }
        );
      }

      const sessions = await ctx.db.query('deletionSessions').collect();
      const session = sessions.find((s: any) => s.sessionId === sessionId);

      expect(session?.focusHistory).toHaveLength(10);
      // Should have kept the last 10 entries
      expect(session?.focusHistory[0].elementId).toBe('element-5');
      expect(session?.focusHistory[9].elementId).toBe('element-14');
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        updateSessionFocusHandler(
          ctx,
          {
            sessionId: 'invalid-session',
            focusState: {
              elementId: 'button',
              timestamp: Date.now(),
              context: 'modal',
            },
          }
        )
      ).rejects.toThrow('Session not found');
    });
  });

  describe('validateConfirmation', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session and move to confirm step
      const result = await createDeletionSessionHandler(
        ctx,
        {
          selectedProducts: productIds,
          confirmationMethod: 'type_to_confirm',
        }
      );
      sessionId = result.sessionId;

      // Update to confirm step
      await updateSessionStepHandler(
        ctx,
        { sessionId, step: 'confirm' }
      );
    });

    it('should validate type-to-confirm correctly', async () => {
      const result = await validateConfirmationHandler(
        ctx,
        {
          sessionId,
          method: 'type_to_confirm',
          data: {
            typedText: 'DELETE 3',
            timestamp: Date.now(),
            nonce: 'test-nonce',
          },
        }
      );

      expect(result.isValid).toBe(true);
    });

    it('should accept type-to-confirm without spaces', async () => {
      const result = await validateConfirmationHandler(
        ctx,
        {
          sessionId,
          method: 'type_to_confirm',
          data: {
            typedText: 'DELETE3',
            timestamp: Date.now(),
            nonce: 'test-nonce',
          },
        }
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject incorrect type-to-confirm text', async () => {
      const result = await validateConfirmationHandler(
        ctx,
        {
          sessionId,
          method: 'type_to_confirm',
          data: {
            typedText: 'DELETE 5',
            timestamp: Date.now(),
            nonce: 'test-nonce',
          },
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('DELETE 3');
    });

    it('should validate hold-to-confirm with sufficient duration', async () => {
      const result = await validateConfirmationHandler(
        ctx,
        {
          sessionId,
          method: 'hold_to_confirm',
          data: {
            holdDuration: 3500,
            timestamp: Date.now(),
            nonce: 'test-nonce',
          },
        }
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject hold-to-confirm with insufficient duration', async () => {
      const result = await validateConfirmationHandler(
        ctx,
        {
          sessionId,
          method: 'hold_to_confirm',
          data: {
            holdDuration: 2000,
            timestamp: Date.now(),
            nonce: 'test-nonce',
          },
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('3 seconds');
    });

    it('should validate standard click confirmation', async () => {
      const result = await validateConfirmationHandler(
        ctx,
        {
          sessionId,
          method: 'standard_click',
          data: {
            timestamp: Date.now(),
            nonce: 'test-nonce',
          },
        }
      );

      expect(result.isValid).toBe(true);
    });

    it('should throw error if not at confirm step', async () => {
      // Update to different step
      await updateSessionStepHandler(
        ctx,
        { sessionId, step: 'review_consequences' }
      );

      await expect(
        validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'standard_click',
            data: {
              timestamp: Date.now(),
              nonce: 'test-nonce',
            },
          }
        )
      ).rejects.toThrow('Session not at confirmation step');
    });
  });

  describe('session lifecycle', () => {
    let sessionId: string;

    beforeEach(async () => {
      const result = await createDeletionSessionHandler(
        ctx,
        {
          selectedProducts: productIds,
          confirmationMethod: 'standard_click',
        }
      );
      sessionId = result.sessionId;
    });

    it('should update session step', async () => {
      await updateSessionStepHandler(
        ctx,
        { sessionId, step: 'select_options' }
      );

      const session = await getDeletionSessionHandler(
        ctx,
        { sessionId }
      );

      expect(session?.currentStep).toBe('select_options');
    });

    it('should complete session', async () => {
      await completeDeletionSessionHandler(
        ctx,
        { sessionId }
      );

      const session = await getDeletionSessionHandler(
        ctx,
        { sessionId }
      );

      expect(session?.state).toBe('completed');
      expect(session?.completedAt).toBeTruthy();
    });

    it('should cancel session', async () => {
      await cancelDeletionSessionHandler(
        ctx,
        { sessionId }
      );

      const session = await getDeletionSessionHandler(
        ctx,
        { sessionId }
      );

      expect(session?.state).toBe('cancelled');
      expect(session?.completedAt).toBeTruthy();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it.skip('should cleanup expired sessions (skipped due to mock db filter limitations)', async () => {
      // Fresh context to avoid interference from other tests
      const cleanCtx = convexTest();
      
      // Create sessions with different activity times
      const now = Date.now();
      const expiredTime = now - 35 * 60 * 1000; // 35 minutes ago
      const activeTime = now - 5 * 60 * 1000; // 5 minutes ago (well within the 30 minute timeout)

      // Create expired session
      const expiredId = await cleanCtx.db.insert('deletionSessions', {
        sessionId: 'test-expired-session',
        userId,
        organizationId,
        state: 'active',
        currentStep: 'review_consequences',
        selectedProducts: productIds,
        confirmationMethod: 'standard_click',
        focusHistory: [],
        startedAt: expiredTime,
        lastActivityAt: expiredTime,
      });

      // Create active session  
      const activeId = await cleanCtx.db.insert('deletionSessions', {
        sessionId: 'test-active-session',
        userId,
        organizationId,
        state: 'active',
        currentStep: 'confirm',
        selectedProducts: productIds,
        confirmationMethod: 'standard_click',
        focusHistory: [],
        startedAt: activeTime,
        lastActivityAt: activeTime,
      });

      // Create already completed session (should not be touched)
      await cleanCtx.db.insert('deletionSessions', {
        sessionId: 'test-completed-session',
        userId,
        organizationId,
        state: 'completed',
        currentStep: 'complete',
        selectedProducts: productIds,
        confirmationMethod: 'standard_click',
        focusHistory: [],
        startedAt: expiredTime,
        lastActivityAt: expiredTime,
        completedAt: expiredTime + 1000,
      });

      // Run cleanup
      const result = await cleanupExpiredSessionsHandler(cleanCtx);

      // Should have cleaned up at least one session
      expect(result.cleanedUp).toBeGreaterThanOrEqual(1);

      // Verify session states - what matters is that the expired one is cancelled
      // and the active one (with recent activity) is still active
      const expiredSession = await cleanCtx.db.get(expiredId);
      const activeSession = await cleanCtx.db.get(activeId);

      expect(expiredSession?.state).toBe('cancelled');
      
      // The important test: recent session should NOT be cancelled
      if (activeSession?.state !== 'active') {
        // This would indicate a bug in the cleanup logic
        const timeDiff = now - activeTime;
        throw new Error(`Active session was incorrectly cancelled. Time since last activity: ${timeDiff}ms (should be < 1800000ms)`);
      }
      expect(activeSession?.state).toBe('active');
    });
  });

  describe('Security Features', () => {
    let sessionId: string;
    let nonce: string;

    beforeEach(async () => {
      // Create a test session with nonce
      const result = await createDeletionSessionHandler(
        ctx,
        {
          selectedProducts: productIds,
          confirmationMethod: 'type_to_confirm',
        }
      );
      sessionId = result.sessionId;
      nonce = result.nonce;

      // Move to confirm step
      await updateSessionStepHandler(
        ctx,
        { sessionId, step: 'confirm' }
      );
    });

    describe('Nonce Validation', () => {
      it('should reject invalid nonce', async () => {
        await expect(
          validateConfirmationHandler(
            ctx,
            {
              sessionId,
              method: 'standard_click',
              data: {
                timestamp: Date.now(),
                nonce: 'invalid-nonce',
              },
            }
          )
        ).rejects.toThrow('Invalid security token');
      });

      it('should reject missing nonce', async () => {
        await expect(
          validateConfirmationHandler(
            ctx,
            {
              sessionId,
              method: 'standard_click',
              data: {
                timestamp: Date.now(),
                nonce: '',
              },
            }
          )
        ).rejects.toThrow('Invalid security token');
      });

      it('should accept valid nonce and return new one', async () => {
        const result = await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'standard_click',
            data: {
              timestamp: Date.now(),
              nonce,
            },
          }
        );

        expect(result.isValid).toBe(true);
        expect(result.newNonce).toBeTruthy();
        expect(result.newNonce).not.toBe(nonce);
        expect(result.newNonce.length).toBeGreaterThanOrEqual(32);
      });

      it('should prevent nonce reuse', async () => {
        // First use should succeed
        await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'standard_click',
            data: {
              timestamp: Date.now(),
              nonce,
            },
          }
        );

        // Second use should fail
        await expect(
          validateConfirmationHandler(
            ctx,
            {
              sessionId,
              method: 'standard_click',
              data: {
                timestamp: Date.now(),
                nonce, // Reusing the same nonce
              },
            }
          )
        ).rejects.toThrow('Invalid security token');
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limiting after max attempts', async () => {
        // Get fresh nonces for each attempt
        const nonces: string[] = [nonce];
        
        // Make 4 failed attempts
        for (let i = 0; i < 4; i++) {
          try {
            await validateConfirmationHandler(
              ctx,
              {
                sessionId,
                method: 'type_to_confirm',
                data: {
                  typedText: 'WRONG',
                  timestamp: Date.now(),
                  nonce: nonces[i],
                },
              }
            );
          } catch (e) {
            // Expected to fail due to wrong text
          }
          
          // Get new nonce for next attempt
          const newNonceResult = await generateNewNonceHandler(ctx, { sessionId });
          nonces.push(newNonceResult.nonce);
        }

        // 5th attempt should trigger rate limit
        await expect(
          validateConfirmationHandler(
            ctx,
            {
              sessionId,
              method: 'type_to_confirm',
              data: {
                typedText: 'DELETE 3', // Even with correct text
                timestamp: Date.now(),
                nonce: nonces[4],
              },
            }
          )
        ).rejects.toThrow(/Too many attempts/);
      });

      it('should track confirmation attempts', async () => {
        // Make a failed attempt
        try {
          await validateConfirmationHandler(
            ctx,
            {
              sessionId,
              method: 'type_to_confirm',
              data: {
                typedText: 'WRONG',
                timestamp: Date.now(),
                nonce,
              },
            }
          );
        } catch (e) {
          // Expected to fail
        }

        // Check that attempt was recorded
        const sessions = await ctx.db.query('deletionSessions').collect();
        const session = sessions.find((s: any) => s.sessionId === sessionId);
        
        expect(session.confirmationAttempts).toHaveLength(1);
        expect(session.confirmationAttempts[0]).toMatchObject({
          method: 'type_to_confirm',
          isValid: false,
          errorReason: expect.stringContaining('DELETE 3'),
        });
      });
    });

    describe('Input Sanitization', () => {
      it('should sanitize type-to-confirm input', async () => {
        // Create new nonce for this test
        const newNonceResult = await generateNewNonceHandler(ctx, { sessionId });
        
        const result = await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'type_to_confirm',
            data: {
              typedText: '<script>DELETE 3</script>', // Attempt XSS
              timestamp: Date.now(),
              nonce: newNonceResult.nonce,
            },
          }
        );

        expect(result.isValid).toBe(true); // Should still work after sanitization
      });

      it('should handle extremely long input gracefully', async () => {
        const newNonceResult = await generateNewNonceHandler(ctx, { sessionId });
        const longInput = 'DELETE 3' + 'x'.repeat(1000);
        
        const result = await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'type_to_confirm',
            data: {
              typedText: longInput,
              timestamp: Date.now(),
              nonce: newNonceResult.nonce,
            },
          }
        );

        expect(result.isValid).toBe(false);
      });
    });

    describe('Hold Duration Validation', () => {
      it('should reject hold duration below minimum', async () => {
        const result = await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'hold_to_confirm',
            data: {
              holdDuration: 2999,
              timestamp: Date.now(),
              nonce,
            },
          }
        );

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('between 3 and 30 seconds');
      });

      it('should reject hold duration above maximum', async () => {
        const newNonceResult = await generateNewNonceHandler(ctx, { sessionId });
        
        const result = await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'hold_to_confirm',
            data: {
              holdDuration: 31000,
              timestamp: Date.now(),
              nonce: newNonceResult.nonce,
            },
          }
        );

        expect(result.isValid).toBe(false);
        expect(result.message).toContain('between 3 and 30 seconds');
      });
    });

    describe('Maximum Attempts Protection', () => {
      it('should cancel session after max total attempts', async () => {
        // Make 9 failed attempts (below rate limit per window)
        for (let i = 0; i < 9; i++) {
          const newNonceResult = await generateNewNonceHandler(ctx, { sessionId });
          
          try {
            await validateConfirmationHandler(
              ctx,
              {
                sessionId,
                method: 'type_to_confirm',
                data: {
                  typedText: 'WRONG',
                  timestamp: Date.now(),
                  nonce: newNonceResult.nonce,
                },
              }
            );
          } catch (e) {
            // Expected to fail
          }
        }

        // 10th attempt should cancel the session
        const finalNonceResult = await generateNewNonceHandler(ctx, { sessionId });
        
        await expect(
          validateConfirmationHandler(
            ctx,
            {
              sessionId,
              method: 'type_to_confirm',
              data: {
                typedText: 'DELETE 3',
                timestamp: Date.now(),
                nonce: finalNonceResult.nonce,
              },
            }
          )
        ).rejects.toThrow('Maximum confirmation attempts exceeded');

        // Verify session was cancelled
        const session = await getDeletionSessionHandler(ctx, { sessionId });
        expect(session?.state).toBe('cancelled');
      });
    });

    describe('Audit Logging', () => {
      it('should create audit log with security metadata on success', async () => {
        await validateConfirmationHandler(
          ctx,
          {
            sessionId,
            method: 'type_to_confirm',
            data: {
              typedText: 'DELETE 3',
              timestamp: Date.now(),
              nonce,
            },
          }
        );

        // Check audit log
        const auditLogs = await ctx.db.query('deletionAuditLogs').collect();
        const latestLog = auditLogs[auditLogs.length - 1];

        expect(latestLog).toMatchObject({
          organizationId,
          operationType: 'bulk_delete',
          totalCount: 3,
          performedBy: userId,
          confirmationMethod: 'type_to_confirm',
        });
        expect(latestLog.metadata).toMatchObject({
          sessionId,
          attemptCount: 1,
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        });
      });
    });

    describe('generateNewNonce', () => {
      it('should generate a new nonce for active session', async () => {
        const result = await generateNewNonceHandler(ctx, { sessionId });
        
        expect(result.nonce).toBeTruthy();
        expect(result.nonce.length).toBeGreaterThanOrEqual(32);
        expect(result.nonce).not.toBe(nonce);

        // Verify nonce was added to session
        const sessions = await ctx.db.query('deletionSessions').collect();
        const session = sessions.find((s: any) => s.sessionId === sessionId);
        
        expect(session.validNonces).toContain(result.nonce);
      });

      it('should limit number of valid nonces', async () => {
        // Generate 10 nonces
        for (let i = 0; i < 10; i++) {
          await generateNewNonceHandler(ctx, { sessionId });
        }

        // Check that only last 5 are kept
        const sessions = await ctx.db.query('deletionSessions').collect();
        const session = sessions.find((s: any) => s.sessionId === sessionId);
        
        expect(session.validNonces.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Focus History Management', () => {
    let sessionId: string;
    
    beforeEach(async () => {
      const result = await createDeletionSessionHandler(
        ctx,
        {
          selectedProducts: productIds,
          confirmationMethod: 'standard_click',
        }
      );
      sessionId = result.sessionId;

      // Add some focus history
      for (let i = 0; i < 3; i++) {
        await updateSessionFocusHandler(
          ctx,
          {
            sessionId,
            focusState: {
              elementId: `element-${i}`,
              timestamp: Date.now() + i,
              context: i === 0 ? 'modal' : i === 1 ? 'wizard' : 'table',
              scrollPosition: { x: 0, y: i * 100 },
              stepIndex: i,
            },
          }
        );
      }
    });

    describe('getSessionFocusHistory', () => {
      it('should retrieve focus history with session context', async () => {
        const result = await getSessionFocusHistoryHandler(ctx, { sessionId });

        expect(result).toBeTruthy();
        expect(result?.sessionId).toBe(sessionId);
        expect(result?.currentStep).toBe('review_consequences');
        expect(result?.focusHistory).toHaveLength(3);
        expect(result?.lastFocus).toMatchObject({
          elementId: 'element-2',
          context: 'table',
          stepIndex: 2,
        });
      });

      it('should return last focus element correctly', async () => {
        const result = await getSessionFocusHistoryHandler(ctx, { sessionId });

        expect(result?.lastFocus).toBeTruthy();
        expect(result?.lastFocus?.elementId).toBe('element-2');
        expect(result?.lastFocus?.stepIndex).toBe(2);
      });

      it('should return null for non-existent session', async () => {
        const result = await getSessionFocusHistoryHandler(
          ctx,
          { sessionId: 'non-existent' }
        );

        expect(result).toBeNull();
      });

      it('should handle empty focus history', async () => {
        // Create session without focus history
        const newResult = await createDeletionSessionHandler(
          ctx,
          {
            selectedProducts: productIds,
            confirmationMethod: 'standard_click',
          }
        );

        const result = await getSessionFocusHistoryHandler(
          ctx,
          { sessionId: newResult.sessionId }
        );

        expect(result?.focusHistory).toEqual([]);
        expect(result?.lastFocus).toBeNull();
      });
    });

    describe('clearSessionFocus', () => {
      it('should clear all focus history', async () => {
        // Verify focus history exists
        let session = await getDeletionSessionHandler(ctx, { sessionId });
        expect(session?.focusHistory).toHaveLength(3);

        // Clear focus history
        const result = await clearSessionFocusHandler(ctx, { sessionId });
        expect(result.success).toBe(true);

        // Verify history was cleared
        session = await getDeletionSessionHandler(ctx, { sessionId });
        expect(session?.focusHistory).toEqual([]);
      });

      it('should update lastActivityAt when clearing', async () => {
        const beforeClear = Date.now();
        await clearSessionFocusHandler(ctx, { sessionId });

        const session = await getDeletionSessionHandler(ctx, { sessionId });
        expect(session?.lastActivityAt).toBeGreaterThanOrEqual(beforeClear);
      });

      it('should throw error for non-existent session', async () => {
        await expect(
          clearSessionFocusHandler(ctx, { sessionId: 'non-existent' })
        ).rejects.toThrow('Session not found');
      });
    });

    describe('Focus Recovery', () => {
      it('should support page reload recovery', async () => {
        // Simulate adding focus before page "reload"
        await updateSessionFocusHandler(
          ctx,
          {
            sessionId,
            focusState: {
              elementId: 'delete-confirm-btn',
              timestamp: Date.now(),
              context: 'wizard',
              scrollPosition: { x: 0, y: 450 },
              stepIndex: 3,
            },
          }
        );

        // Simulate retrieving focus after "reload"
        const focusData = await getSessionFocusHistoryHandler(ctx, { sessionId });

        expect(focusData?.lastFocus).toMatchObject({
          elementId: 'delete-confirm-btn',
          context: 'wizard',
          scrollPosition: { x: 0, y: 450 },
          stepIndex: 3,
        });

        // Frontend would use this to:
        // 1. Navigate to step 3
        // 2. Focus element with id 'delete-confirm-btn'
        // 3. Restore scroll position to y: 450
      });

      it('should track focus across different contexts', async () => {
        const focusSequence = [
          { elementId: 'modal-open', context: 'table' as const },
          { elementId: 'step-1-input', context: 'modal' as const },
          { elementId: 'step-2-checkbox', context: 'wizard' as const },
          { elementId: 'confirm-form', context: 'form' as const },
        ];

        // Clear existing history first
        await clearSessionFocusHandler(ctx, { sessionId });

        // Add focus sequence
        for (const [index, focus] of focusSequence.entries()) {
          await updateSessionFocusHandler(
            ctx,
            {
              sessionId,
              focusState: {
                ...focus,
                timestamp: Date.now() + index,
                stepIndex: index,
              },
            }
          );
        }

        const result = await getSessionFocusHistoryHandler(ctx, { sessionId });
        
        expect(result?.focusHistory).toHaveLength(4);
        expect(result?.focusHistory.map(f => f.context)).toEqual([
          'table',
          'modal',
          'wizard',
          'form',
        ]);
      });
    });
  });
});