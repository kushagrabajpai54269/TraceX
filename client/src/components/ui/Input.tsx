import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef } from 'react';
import { Search } from 'lucide-react';

/* ============================================================
   Text Input
   ============================================================ */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
  required?: boolean;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helper, leftIcon, required, containerClassName = '', className = '', ...rest },
  ref
) {
  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label className={`form-label ${required ? 'form-label--required' : ''}`}>
          {label}
        </label>
      )}
      {leftIcon ? (
        <div className="form-input-wrapper">
          <span className="form-input-wrapper__icon">{leftIcon}</span>
          <input
            ref={ref}
            className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
            {...rest}
          />
        </div>
      ) : (
        <input
          ref={ref}
          className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
          {...rest}
        />
      )}
      {error  && <span className="form-error">{error}</span>}
      {helper && !error && <span className="form-helper">{helper}</span>}
    </div>
  );
});

/* ============================================================
   Search Input
   ============================================================ */
interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({ containerClassName = '', className = '', ...rest }: SearchInputProps) {
  return (
    <div className={`form-input-wrapper ${containerClassName}`}>
      <span className="form-input-wrapper__icon">
        <Search size={14} />
      </span>
      <input
        className={`form-input ${className}`}
        style={{ paddingLeft: 36 }}
        placeholder="Search…"
        {...rest}
      />
    </div>
  );
}

/* ============================================================
   Select
   ============================================================ */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label, error, required, options, containerClassName = '', className = '', ...rest
}: SelectProps) {
  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label className={`form-label ${required ? 'form-label--required' : ''}`}>
          {label}
        </label>
      )}
      <select
        className={`form-select ${error ? 'form-input--error' : ''} ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

/* ============================================================
   Segment Control (depth / direction selectors)
   ============================================================ */
interface SegmentOption { value: string; label: string }

interface SegmentControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SegmentControl({ options, value, onChange, disabled }: SegmentControlProps) {
  return (
    <div className="segment-control">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segment-btn ${value === opt.value ? 'segment-btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
