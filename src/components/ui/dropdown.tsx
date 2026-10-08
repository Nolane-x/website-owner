import React from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuPortal = DropdownPrimitive.Portal;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: DropdownPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={twMerge(
          clsx(
            'z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-md,0.625rem)] border border-[var(--border-color)] bg-[var(--bg-surface)] p-1 text-[var(--text-primary)] shadow-md animate-in fade-in-80',
            className
          )
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: DropdownPrimitive.DropdownMenuItemProps & {
  inset?: boolean;
}) {
  return (
    <DropdownPrimitive.Item
      className={twMerge(
        clsx(
          'relative flex cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-xs outline-none transition-colors hover:bg-[var(--bg-surface-subtle)] focus:bg-[var(--bg-surface-subtle)] focus:text-[var(--text-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          inset && 'pl-8',
          className
        )
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: DropdownPrimitive.DropdownMenuSeparatorProps) {
  return (
    <DropdownPrimitive.Separator
      className={twMerge('-mx-1 my-1 h-px bg-[var(--border-color)]', className)}
      {...props}
    />
  );
}
