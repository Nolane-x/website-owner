import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, disabled, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border rounded-[var(--radius-md,0.625rem)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] transition-all duration-150 resize-y',
              error
                ? 'border-[var(--danger)] focus:ring-[var(--danger)]'
                : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]',
              disabled ? 'opacity-50 cursor-not-allowed bg-[var(--bg-surface-subtle)]' : '',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)] font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-[var(--text-muted)]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
