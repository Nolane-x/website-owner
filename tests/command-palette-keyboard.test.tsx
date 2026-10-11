// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  desktopMode: 'workspace' as 'workspace' | 'desktop',
  setDesktopMode: vi.fn(),
  openWindow: vi.fn(),
  minimizeWindow: vi.fn(),
  setScreensaverOpen: vi.fn(),
  playSound: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/lib/desktop/window-manager-context', () => ({
  useWindowManager: () => ({
    desktopMode: mocks.desktopMode,
    setDesktopMode: mocks.setDesktopMode,
    openWindow: mocks.openWindow,
    windows: [],
    minimizeWindow: mocks.minimizeWindow,
    setScreensaverOpen: mocks.setScreensaverOpen,
  }),
}));

vi.mock('@/lib/audio/sound-fx', () => ({
  playSound: mocks.playSound,
}));

import { CommandMenu } from '@/components/ui/command-menu';
import { OmniCommandPalette } from '@/components/desktop/omni-command-palette';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mocks.desktopMode = 'workspace';
});

describe('owner command palettes keyboard behavior', () => {
  it('closes the workspace command menu when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(
      <CommandMenu
        open
        onOpenChange={onOpenChange}
      />,
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(event); });

    expect(event.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not let the hidden workspace menu handle Ctrl+K in desktop mode', () => {
    mocks.desktopMode = 'desktop';
    const onOpenChange = vi.fn();
    render(
      <CommandMenu
        open={false}
        onOpenChange={onOpenChange}
      />,
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k', ctrlKey: true, bubbles: true, cancelable: true,
      }));
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes the desktop Omni palette when Escape is pressed even if focus is on the input', () => {
    const onClose = vi.fn();
    render(<OmniCommandPalette isOpen onClose={onClose} />);

    const input = document.querySelector('input');
    expect(input).not.toBeNull();
    if (!input) throw new Error('Omni command input did not render.');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
