'use client';

import React, { useState, useRef } from 'react';
import {
  DialogFocusTrap,
  WizardFocusTrap,
  WizardFocusController,
  useRovingTabIndex,
  type WizardStep,
} from '@/components/accessibility/focus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Example wizard steps
const deletionWizardSteps: WizardStep[] = [
  {
    id: 'select',
    title: 'Select Products',
    description: 'Choose products to delete',
    focusTarget: '#product-search',
  },
  {
    id: 'review',
    title: 'Review Consequences',
    description: 'Understand the impact of deletion',
    focusTarget: '[data-focus-zone="consequences"] button:first-child',
  },
  {
    id: 'confirm',
    title: 'Confirm Deletion',
    description: 'Final confirmation before deletion',
    focusTarget: '#deletion-reason',
  },
];

export function FocusManagementDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentWizardStep, setCurrentWizardStep] = useState(0);
  const [toolbarActiveIndex, setToolbarActiveIndex] = useState(0);
  
  // Ref for toolbar items
  const toolbarItemsRef = useRef<HTMLButtonElement[]>([]);

  // Use roving tabindex for toolbar
  const { handleFocus } = useRovingTabIndex(
    { current: toolbarItemsRef.current } as React.RefObject<HTMLElement[]>,
    {
      orientation: 'horizontal',
      loop: true,
      onSelect: (index) => {
        console.log('Selected toolbar item:', index);
      },
    }
  );

  return (
    <div className="space-y-6">
      {/* Basic Dialog Focus Trap Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Dialog Focus Trap</CardTitle>
          <CardDescription>
            Demonstrates focus trapping within a modal dialog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setDialogOpen(true)}>
            Open Dialog
          </Button>

          {dialogOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <DialogFocusTrap
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                dialogTitle="Example Dialog"
                className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full"
              >
                <div className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold">Example Dialog</h2>
                  <p className="text-muted-foreground">
                    Tab navigation is trapped within this dialog. Press Escape to close.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dialog-input">Name</Label>
                      <Input id="dialog-input" placeholder="Enter your name" />
                    </div>
                    
                    <div>
                      <Label htmlFor="dialog-textarea">Message</Label>
                      <Textarea
                        id="dialog-textarea"
                        placeholder="Enter your message"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setDialogOpen(false)}>
                      Submit
                    </Button>
                  </div>
                </div>
              </DialogFocusTrap>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wizard Focus Management Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Wizard Focus Management</CardTitle>
          <CardDescription>
            Multi-step wizard with focus management and keyboard navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setWizardOpen(true)}>
            Open Deletion Wizard
          </Button>

          {wizardOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <WizardFocusTrap
                active={wizardOpen}
                currentStep={currentWizardStep}
                totalSteps={deletionWizardSteps.length}
                onClose={() => {
                  setWizardOpen(false);
                  setCurrentWizardStep(0);
                }}
                wizardTitle="Delete Products"
                className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto"
              >
                <WizardFocusController
                  steps={deletionWizardSteps}
                  currentStep={currentWizardStep}
                  onStepChange={setCurrentWizardStep}
                  className="p-6"
                >
                  {/* Step indicator */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      {deletionWizardSteps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`flex items-center ${
                            index < deletionWizardSteps.length - 1 ? 'flex-1' : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              index <= currentWizardStep
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          {index < deletionWizardSteps.length - 1 && (
                            <div
                              className={`flex-1 h-1 mx-2 ${
                                index < currentWizardStep
                                  ? 'bg-blue-600'
                                  : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <h2 className="text-xl font-semibold">
                      {deletionWizardSteps[currentWizardStep]?.title || 'Step'}
                    </h2>
                    <p className="text-muted-foreground">
                      {deletionWizardSteps[currentWizardStep]?.description || ''}
                    </p>
                  </div>

                  {/* Step content */}
                  <div className="space-y-4">
                    {currentWizardStep === 0 && (
                      <div data-focus-zone="select-products">
                        <Label htmlFor="product-search">Search Products</Label>
                        <Input
                          id="product-search"
                          placeholder="Type to search..."
                          className="mb-4"
                        />
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            Product 1
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            Product 2
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            Product 3
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentWizardStep === 1 && (
                      <div data-focus-zone="consequences">
                        <h3 className="font-semibold mb-2">Deletion Impact:</h3>
                        <div className="space-y-2">
                          <Button variant="destructive" className="w-full">
                            3 Active Products will be deleted
                          </Button>
                          <Button variant="outline" className="w-full">
                            12 Related items will be affected
                          </Button>
                          <Button variant="outline" className="w-full">
                            View detailed impact report
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentWizardStep === 2 && (
                      <div data-focus-zone="confirm">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="deletion-reason">
                              Reason for Deletion
                            </Label>
                            <Textarea
                              id="deletion-reason"
                              placeholder="Please provide a reason..."
                              rows={3}
                            />
                          </div>
                          
                          <RadioGroup defaultValue="immediate">
                            <Label>Deletion Timing</Label>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="immediate" id="immediate" />
                              <Label htmlFor="immediate">Delete immediately</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="scheduled" id="scheduled" />
                              <Label htmlFor="scheduled">Schedule for later</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex justify-between mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentWizardStep === 0) {
                          setWizardOpen(false);
                          setCurrentWizardStep(0);
                        } else {
                          setCurrentWizardStep(currentWizardStep - 1);
                        }
                      }}
                    >
                      {currentWizardStep === 0 ? 'Cancel' : 'Previous'}
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      Use Alt+← and Alt+→ to navigate
                    </div>

                    <Button
                      onClick={() => {
                        if (currentWizardStep === deletionWizardSteps.length - 1) {
                          // Final step - perform action
                          alert('Deletion confirmed!');
                          setWizardOpen(false);
                          setCurrentWizardStep(0);
                        } else {
                          setCurrentWizardStep(currentWizardStep + 1);
                        }
                      }}
                      variant={
                        currentWizardStep === deletionWizardSteps.length - 1
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {currentWizardStep === deletionWizardSteps.length - 1
                        ? 'Confirm Delete'
                        : 'Next'}
                    </Button>
                  </div>
                </WizardFocusController>
              </WizardFocusTrap>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roving TabIndex Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Roving TabIndex (Toolbar)</CardTitle>
          <CardDescription>
            Use arrow keys to navigate toolbar items. Only one item has tabindex="0" at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="toolbar"
            aria-label="Text formatting"
            className="flex gap-2 p-2 border rounded"
          >
            {['Bold', 'Italic', 'Underline', 'Link', 'Code'].map((item, index) => (
              <Button
                key={item}
                ref={(el) => {
                  if (el) toolbarItemsRef.current[index] = el;
                }}
                variant="outline"
                size="sm"
                tabIndex={index === toolbarActiveIndex ? 0 : -1}
                onFocus={() => handleFocus(index)}
                onClick={() => console.log(`Clicked ${item}`)}
              >
                {item}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Tab to the toolbar, then use arrow keys to navigate between items.
            Press Enter or Space to activate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}