import React from 'react';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  const progress = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Step {currentStep} of {steps.length}
        </span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-accent)' }}>
          {progress}% Complete
        </span>
      </div>
      <div className="progress-bar-outer" style={{ marginBottom: '1.75rem' }}>
        <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
      </div>

      {/* Step dots */}
      <div className="stepper-wrapper">
        <div className="stepper">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;

            return (
              <React.Fragment key={idx}>
                <div className="step-item">
                  <div className={`step-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                    {isCompleted ? (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : stepNum}
                  </div>
                  <span className={`step-label ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                    {step}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
