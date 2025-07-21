// Design mockup components for accessible confirmation methods
// These are visual examples for developer implementation reference

import React from 'react';

// Hold-to-Confirm Button Component Mockup
export const HoldToConfirmButtonMockup = () => {
  return (
    <div className="hold-to-confirm-container">
      {/* Initial State */}
      <div className="mockup-state">
        <h4>Initial State</h4>
        <button className="hold-button initial">
          <span className="button-text">Hold to Delete</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '0%' }}></div>
          </div>
          <span className="helper-text">Hold for 3 seconds</span>
        </button>
      </div>

      {/* Progress State 25% */}
      <div className="mockup-state">
        <h4>Progress: 25%</h4>
        <button className="hold-button in-progress">
          <span className="button-text">Keep Holding...</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '25%' }}></div>
          </div>
          <span className="helper-text">2.25s remaining</span>
        </button>
      </div>

      {/* Progress State 75% */}
      <div className="mockup-state">
        <h4>Progress: 75%</h4>
        <button className="hold-button in-progress">
          <span className="button-text">Almost there...</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '75%' }}></div>
          </div>
          <span className="helper-text">0.75s remaining</span>
        </button>
      </div>

      {/* Complete State */}
      <div className="mockup-state">
        <h4>Complete</h4>
        <button className="hold-button complete">
          <span className="button-text">✓ Confirmed</span>
          <div className="progress-track">
            <div className="progress-fill complete" style={{ width: '100%' }}></div>
          </div>
          <span className="helper-text">Action confirmed</span>
        </button>
      </div>

      {/* Cancelled State */}
      <div className="mockup-state">
        <h4>Cancelled</h4>
        <button className="hold-button cancelled">
          <span className="button-text">✗ Cancelled</span>
          <div className="progress-track">
            <div className="progress-fill cancelled" style={{ width: '40%' }}></div>
          </div>
          <span className="helper-text">Release to cancel</span>
        </button>
      </div>
    </div>
  );
};

// Type-to-Confirm Input Component Mockup
export const TypeToConfirmInputMockup = () => {
  return (
    <div className="type-to-confirm-container">
      {/* Empty State */}
      <div className="mockup-state">
        <h4>Empty State</h4>
        <div className="type-confirm-group">
          <label htmlFor="confirm-empty">Type "DELETE" to confirm:</label>
          <input 
            id="confirm-empty"
            type="text" 
            className="confirm-input empty"
            placeholder="DELETE"
            value=""
            readOnly
          />
          <div className="helper-message info">
            <span className="icon">ⓘ</span>
            <span>This action cannot be undone</span>
          </div>
        </div>
      </div>

      {/* Partial Match */}
      <div className="mockup-state">
        <h4>Partial Match</h4>
        <div className="type-confirm-group">
          <label htmlFor="confirm-partial">Type "DELETE" to confirm:</label>
          <input 
            id="confirm-partial"
            type="text" 
            className="confirm-input partial"
            value="DEL"
            readOnly
          />
          <div className="helper-message warning">
            <span className="icon">⚠</span>
            <span>3 more characters needed</span>
          </div>
        </div>
      </div>

      {/* Complete Match */}
      <div className="mockup-state">
        <h4>Complete Match</h4>
        <div className="type-confirm-group">
          <label htmlFor="confirm-complete">Type "DELETE" to confirm:</label>
          <input 
            id="confirm-complete"
            type="text" 
            className="confirm-input complete"
            value="DELETE"
            readOnly
          />
          <div className="helper-message success">
            <span className="icon">✓</span>
            <span>Ready to proceed</span>
          </div>
        </div>
      </div>

      {/* Mismatch */}
      <div className="mockup-state">
        <h4>Mismatch</h4>
        <div className="type-confirm-group">
          <label htmlFor="confirm-mismatch">Type "DELETE" to confirm:</label>
          <input 
            id="confirm-mismatch"
            type="text" 
            className="confirm-input mismatch"
            value="DELTE"
            readOnly
          />
          <div className="helper-message error">
            <span className="icon">✗</span>
            <span>Text doesn't match. Please try again.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Method Selector Mockup
export const ConfirmationMethodSelectorMockup = () => {
  return (
    <div className="confirmation-selector-container">
      <h3>Choose confirmation method:</h3>
      
      <div className="method-options">
        <div className="method-option">
          <input type="radio" id="method-click" name="method" value="click" />
          <label htmlFor="method-click">
            <span className="method-title">Standard Click</span>
            <span className="method-description">Quick confirmation for non-critical actions</span>
          </label>
        </div>

        <div className="method-option recommended">
          <input type="radio" id="method-hold" name="method" value="hold" defaultChecked />
          <label htmlFor="method-hold">
            <span className="method-title">Hold to Confirm</span>
            <span className="badge">Recommended</span>
            <span className="method-description">Prevents accidental clicks</span>
          </label>
        </div>

        <div className="method-option">
          <input type="radio" id="method-type" name="method" value="type" />
          <label htmlFor="method-type">
            <span className="method-title">Type to Confirm</span>
            <span className="method-description">Maximum security for critical actions</span>
          </label>
        </div>
      </div>
    </div>
  );
};

// CSS Styles for Mockups
export const mockupStyles = `
/* Hold-to-Confirm Button Styles */
.hold-button {
  position: relative;
  width: 280px;
  height: 56px;
  padding: 12px 20px;
  border-radius: 8px;
  border: 2px solid #D1D5DB;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hold-button .button-text {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.hold-button .progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: #F3F4F6;
  border-radius: 0 0 6px 6px;
  overflow: hidden;
}

.hold-button .progress-fill {
  height: 100%;
  background: #2563EB;
  transition: width 0.1s linear;
}

.hold-button .helper-text {
  font-size: 12px;
  color: #6B7280;
}

.hold-button.initial {
  border-color: #D1D5DB;
}

.hold-button.in-progress {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.hold-button.complete {
  border-color: #10B981;
  background: #F0FDF4;
}

.hold-button.complete .progress-fill {
  background: #10B981;
}

.hold-button.cancelled {
  border-color: #EF4444;
  background: #FEF2F2;
}

.hold-button.cancelled .progress-fill {
  background: #EF4444;
}

/* Type-to-Confirm Input Styles */
.confirm-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  font-family: monospace;
  border: 2px solid #D1D5DB;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.confirm-input.empty {
  border-color: #D1D5DB;
}

.confirm-input.partial {
  border-color: #F59E0B;
  background: #FEF3C7;
}

.confirm-input.complete {
  border-color: #10B981;
  background: #F0FDF4;
}

.confirm-input.mismatch {
  border-color: #EF4444;
  background: #FEF2F2;
}

.helper-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 14px;
}

.helper-message.info { color: #2563EB; }
.helper-message.warning { color: #F59E0B; }
.helper-message.success { color: #10B981; }
.helper-message.error { color: #EF4444; }

/* Confirmation Method Selector Styles */
.method-option {
  padding: 16px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.method-option:hover {
  border-color: #2563EB;
  background: #F9FAFB;
}

.method-option.recommended {
  border-color: #2563EB;
  background: #EFF6FF;
}

.method-option label {
  display: block;
  cursor: pointer;
}

.method-title {
  font-size: 16px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.method-description {
  font-size: 14px;
  color: #6B7280;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  background: #2563EB;
  color: white;
  font-size: 12px;
  border-radius: 4px;
  margin-left: 8px;
}

/* Focus States */
.hold-button:focus,
.confirm-input:focus,
.method-option input:focus + label {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .hold-button:focus,
  .confirm-input:focus {
    outline: 3px solid black;
    outline-offset: 2px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .hold-button,
  .confirm-input,
  .method-option {
    transition: none;
  }
  
  .progress-fill {
    transition: none;
  }
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .hold-button {
    width: 100%;
  }
  
  .method-option {
    padding: 20px;
  }
}
`;