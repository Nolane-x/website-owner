import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className,
  title,
  description,
  ...props
}: DialogPrimitive.DialogContentProps & {
  title?: string;
  description?: string;
}) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={twMerge(
          clsx(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl duration-200 rounded-[var(--radius-lg,0.875rem)] focus:outline-none max-h-[90vh] overflow-y-auto',
            className
          )
        )}
        {...props}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <div>
            {title && (
              <DialogPrimitive.Title className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {title}
              </DialogPrimitive.Title>
            )}
            {description && (
              <DialogPrimitive.Description className="text-xs text-[var(--text-secondary)] mt-0.5">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] transition-colors">
            <X size={18} />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
