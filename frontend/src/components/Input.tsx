import React, { forwardRef } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  registration?: UseFormRegisterReturn;
}

interface InputProps extends BaseFieldProps, React.InputHTMLAttributes<HTMLInputElement> {}
interface TextAreaProps extends BaseFieldProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
interface SelectProps extends BaseFieldProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[];
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, registration, className, ...props }, ref) => (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
      <input
        ref={ref}
        {...registration}
        {...props}
        className={`form-input${error ? ' error' : ''}`}
      />
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="form-error">⚠ {error}</span>}
    </div>
  )
);
Input.displayName = 'Input';

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, required, registration, className, ...props }, ref) => (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
      <textarea
        ref={ref}
        {...registration}
        {...props}
        className={`form-textarea${error ? ' error' : ''}`}
      />
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="form-error">⚠ {error}</span>}
    </div>
  )
);
TextArea.displayName = 'TextArea';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, options, registration, className, ...props }, ref) => (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
      <select
        ref={ref}
        {...registration}
        {...props}
        className={`form-select${error ? ' error' : ''}`}
      >
        <option value="">Select an option…</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="form-error">⚠ {error}</span>}
    </div>
  )
);
Select.displayName = 'Select';
