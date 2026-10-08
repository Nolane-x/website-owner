import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            type={effectiveType}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full px-3.5 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border rounded-[var(--radius-md,0.625rem)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] transition-all duration-150',
                error
                  ? 'border-[var(--danger)] focus:ring-[var(--danger)]'
                  : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]',
                isPassword ? 'pr-10' : '',
                disabled ? 'opacity-50 cursor-not-allowed bg-[var(--bg-surface-subtle)]' : '',
                className
              )
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-[var(--danger)] font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-[var(--text-muted)]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
