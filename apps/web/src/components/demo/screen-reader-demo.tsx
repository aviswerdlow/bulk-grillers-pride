'use client';

import React, { useState } from 'react';
import {
  DeletionFlowAnnouncer,
  StatusAnnouncer,
  LoadingAnnouncer,
  FormStatusAnnouncer,
  OperationResultAnnouncer,
  CountdownAnnouncer,
  ScreenReaderOnly,
  VisuallyHidden,
  useDeletionAnnouncements,
} from '@/components/accessibility/announcements';
import { useAnnouncement } from '@/contexts/accessibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SeverityIndicator } from '@/components/accessibility/patterns';

type DeletionStep = 'select' | 'review' | 'confirm' | 'processing' | 'complete';

export function ScreenReaderDemo() {
  const { announce } = useAnnouncement();
  const { 
    announceAction, 
    announceWarning, 
    announceError, 
    announceProgress,
    announceCompletion 
  } = useDeletionAnnouncements();

  // Deletion flow state
  const [deletionStep, setDeletionStep] = useState<DeletionStep>('select');
  const [selectedCount, setSelectedCount] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [processingDeletion, setProcessingDeletion] = useState(false);

  // Other demo states
  const [loading, setLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [operationResult, setOperationResult] = useState<'success' | 'error' | 'partial' | null>(null);

  // Simulate deletion process
  const simulateDeletion = async () => {
    setDeletionStep('processing');
    setProcessingDeletion(true);
    setDeletedCount(0);

    for (let i = 1; i <= selectedCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setDeletedCount(i);
      announceProgress(i, selectedCount, 'Deleting products');
    }

    setDeletionStep('complete');
    setProcessingDeletion(false);
    announceCompletion(`Successfully deleted ${selectedCount} products`);
  };

  // Simulate countdown
  const startCountdown = () => {
    let seconds = 10;
    setCountdown(seconds);
    
    const interval = setInterval(() => {
      seconds--;
      setCountdown(seconds);
      if (seconds === 0) {
        clearInterval(interval);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Screen Reader Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Screen Reader Announcement System</CardTitle>
          <CardDescription>
            This page demonstrates various screen reader announcement patterns.
            Enable your screen reader to hear the announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScreenReaderOnly>
            <h2>Instructions for Screen Reader Users</h2>
            <p>
              This demonstration page contains various interactive elements that make
              announcements. Each section demonstrates different announcement patterns
              used throughout the application.
            </p>
          </ScreenReaderOnly>
          
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:p-2 focus:rounded-md focus:border"
          >
            Skip to main content
          </a>
        </CardContent>
      </Card>

      {/* Deletion Flow Demo */}
      <Card id="main-content">
        <CardHeader>
          <CardTitle>Deletion Flow Announcer</CardTitle>
          <CardDescription>
            Demonstrates the multi-step deletion wizard with comprehensive announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DeletionFlowAnnouncer
            step={deletionStep}
            totalSteps={5}
            currentStepNumber={
              deletionStep === 'select' ? 1 :
              deletionStep === 'review' ? 2 :
              deletionStep === 'confirm' ? 3 :
              deletionStep === 'processing' ? 4 : 5
            }
            selectedCount={selectedCount}
            totalCount={20}
            deletedCount={deletedCount}
            severity="danger"
          />

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current Step: {deletionStep}</h3>
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletionStep('select')}
                >
                  Select
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletionStep('review')}
                >
                  Review
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletionStep('confirm')}
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={simulateDeletion}
                  disabled={processingDeletion}
                >
                  Process
                </Button>
              </div>
            </div>

            {deletionStep === 'select' && (
              <div>
                <Label>Select Products ({selectedCount} selected)</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCount(c => Math.min(c + 1, 20));
                    }}
                  >
                    Add Product
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCount(c => Math.max(c - 1, 0));
                    }}
                  >
                    Remove Product
                  </Button>
                </div>
              </div>
            )}

            {deletionStep === 'review' && (
              <div className="space-y-2">
                <SeverityIndicator severity="danger">
                  This action cannot be undone
                </SeverityIndicator>
                <p>You are about to delete {selectedCount} products.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Announcer Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Status Announcer</CardTitle>
          <CardDescription>
            Auto-announces status changes with appropriate priority
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['idle', 'loading', 'success', 'error'] as const).map(status => (
              <Button
                key={status}
                variant="outline"
                onClick={() => {
                  const element = document.getElementById('status-demo');
                  if (element) {
                    element.setAttribute('data-status', status);
                  }
                }}
              >
                Set {status}
              </Button>
            ))}
          </div>

          <StatusAnnouncer
            status="idle"
            autoAnnounce={true}
            className="p-4 border rounded text-center"
          />
        </CardContent>
      </Card>

      {/* Loading Announcer Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Announcer</CardTitle>
          <CardDescription>
            Announces loading states and completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 3000);
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Start Loading'}
          </Button>

          <LoadingAnnouncer
            loading={loading}
            loadingMessage="Fetching data, please wait"
            completeMessage="Data loaded successfully"
          />
        </CardContent>
      </Card>

      {/* Form Status Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Form Status Announcer</CardTitle>
          <CardDescription>
            Announces form submission states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setFormSubmitting(true);
              setFormError(null);
              setFormSuccess(false);

              await new Promise(resolve => setTimeout(resolve, 2000));
              
              if (Math.random() > 0.5) {
                setFormSuccess(true);
                setFormError(null);
              } else {
                setFormError('Failed to submit form. Please try again.');
                setFormSuccess(false);
              }
              
              setFormSubmitting(false);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="demo-input">Demo Input</Label>
              <Input id="demo-input" placeholder="Enter something..." />
            </div>
            
            <Button type="submit" disabled={formSubmitting}>
              {formSubmitting ? 'Submitting...' : 'Submit Form'}
            </Button>

            <FormStatusAnnouncer
              submitting={formSubmitting}
              success={formSuccess}
              error={formError}
            />
          </form>
        </CardContent>
      </Card>

      {/* Manual Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Announcements</CardTitle>
          <CardDescription>
            Trigger different types of announcements manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => announceAction('Product added to cart', 'You now have 5 items')}
            >
              Announce Action
            </Button>
            <Button
              variant="outline"
              onClick={() => announceWarning('Low stock remaining')}
            >
              Announce Warning
            </Button>
            <Button
              variant="outline"
              onClick={() => announceError('Network connection lost')}
            >
              Announce Error
            </Button>
            <Button
              variant="outline"
              onClick={() => announce('Custom announcement', 'polite')}
            >
              Custom Polite
            </Button>
            <Button
              variant="outline"
              onClick={() => announce('Urgent announcement!', 'assertive')}
            >
              Custom Assertive
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOperationResult('success');
                setTimeout(() => setOperationResult(null), 3000);
              }}
            >
              Operation Success
            </Button>
          </div>

          {operationResult && (
            <OperationResultAnnouncer
              operation="save"
              result={operationResult}
              itemCount={3}
              itemName="product"
            />
          )}
        </CardContent>
      </Card>

      {/* Countdown Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Countdown Announcer</CardTitle>
          <CardDescription>
            Announces countdown for timed actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startCountdown} disabled={countdown > 0}>
            Start 10 Second Countdown
          </Button>
          
          {countdown > 0 && (
            <>
              <div className="text-2xl font-bold mt-4">{countdown}</div>
              <CountdownAnnouncer
                seconds={countdown}
                announceInterval={5}
                announceLastSeconds={3}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}