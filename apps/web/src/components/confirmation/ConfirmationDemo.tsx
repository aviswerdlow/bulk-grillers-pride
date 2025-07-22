'use client';

import React, { useState } from 'react';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import { TypeToConfirmInput } from './TypeToConfirmInput';
import { ConfirmationMethodSelector, type ConfirmationMethod } from './ConfirmationMethodSelector';

export function ConfirmationDemo() {
  const [selectedMethod, setSelectedMethod] = useState<ConfirmationMethod>('hold');
  const [canProceed, setCanProceed] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const handleHoldConfirm = () => {
    const message = 'Hold action confirmed!';
    setActionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const handleTypeConfirm = (confirmed: boolean) => {
    setCanProceed(confirmed);
    if (confirmed) {
      const message = 'Type confirmation validated!';
      setActionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };

  const handleMethodChange = (method: ConfirmationMethod) => {
    setSelectedMethod(method);
    setCanProceed(false);
    const message = `Method changed to: ${method}`;
    setActionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Confirmation Components Demo</h2>
        
        {/* Method Selector */}
        <div className="mb-8">
          <ConfirmationMethodSelector
            value={selectedMethod}
            onChange={handleMethodChange}
            recommendedMethod="hold"
          />
        </div>

        {/* Conditional rendering based on selected method */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {selectedMethod === 'click' && 'Standard Click Confirmation'}
            {selectedMethod === 'hold' && 'Hold to Confirm Demo'}
            {selectedMethod === 'type' && 'Type to Confirm Demo'}
          </h3>

          {selectedMethod === 'click' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                This is a standard click confirmation. Click the button below to confirm.
              </p>
              <button
                onClick={() => {
                  const message = 'Standard click confirmed!';
                  setActionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Confirm Action
              </button>
            </div>
          )}

          {selectedMethod === 'hold' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Hold the button below for 3 seconds to confirm the action. You can use mouse, touch, or keyboard (Space/Enter).
              </p>
              <HoldToConfirmButton
                onConfirm={handleHoldConfirm}
                duration={3000}
              >
                Hold to Delete
              </HoldToConfirmButton>
            </div>
          )}

          {selectedMethod === 'type' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Type the word &ldquo;DELETE&rdquo; to enable the action button. This provides maximum security for critical actions.
              </p>
              <TypeToConfirmInput
                confirmText="DELETE"
                onConfirm={handleTypeConfirm}
              />
              <button
                onClick={() => {
                  const message = 'Type confirmation action executed!';
                  setActionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
                }}
                disabled={!canProceed}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Item
              </button>
            </div>
          )}
        </div>

        {/* Action Log */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Action Log</h3>
          <div className="bg-gray-100 rounded-lg p-4 h-32 overflow-y-auto">
            {actionLog.length === 0 ? (
              <p className="text-gray-500">No actions yet. Try the confirmation methods above.</p>
            ) : (
              <ul className="space-y-1">
                {actionLog.map((log, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    {log}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}