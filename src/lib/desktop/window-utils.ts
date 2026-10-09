import { WindowBounds, WindowState } from '@/lib/types';

export interface CreateDefaultWindowOptions {
  id: string;
  appId: string;
  title: string;
  icon?: string;
  initialSize?: { width: number; height: number };
  initialPosition?: { x: number; y: number };
}

export function createDefaultWindow(options: CreateDefaultWindowOptions): WindowState {
  const defaultWidth = options.initialSize?.width || 860;
  const defaultHeight = options.initialSize?.height || 580;

  return {
    id: options.id,
    appId: options.appId,
    title: options.title,
    icon: options.icon,
    isMinimized: false,
    isMaximized: false,
    isPinned: false,
    zIndex: 10,
    position: options.initialPosition || { x: 80, y: 60 },
    size: { width: defaultWidth, height: defaultHeight },
  };
}

export function clampPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  screenWidth: number,
  screenHeight: number,
  topMargin = 32,
  bottomMargin = 80,
  minVisibleX = 100
): { x: number; y: number } {
  const minX = 0;
  const maxX = Math.max(0, screenWidth - minVisibleX);
  const minY = topMargin;
  const maxY = Math.max(topMargin, screenHeight - bottomMargin);

  return {
    x: Math.min(Math.max(minX, pos.x), maxX),
    y: Math.min(Math.max(minY, pos.y), maxY),
  };
}

export function calculateSnapBounds(
  side: 'left' | 'right' | 'maximize',
  screenWidth: number,
  screenHeight: number,
  topBarHeight = 36,
  dockHeight = 64
): WindowBounds {
  const availableHeight = Math.max(200, screenHeight - topBarHeight - dockHeight);

  if (side === 'maximize') {
    return {
      x: 0,
      y: topBarHeight,
      width: screenWidth,
      height: availableHeight,
    };
  }

  const halfWidth = Math.floor(screenWidth / 2);
  if (side === 'left') {
    return {
      x: 0,
      y: topBarHeight,
      width: halfWidth,
      height: availableHeight,
    };
  }

  // right
  return {
    x: halfWidth,
    y: topBarHeight,
    width: halfWidth,
    height: availableHeight,
  };
}

export function reorderZIndices<T extends { id: string; zIndex: number }>(
  items: T[],
  activeId: string,
  baseZIndex = 10
): T[] {
  const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex);
  const activeItem = sorted.find((w) => w.id === activeId);
  const others = sorted.filter((w) => w.id !== activeId);

  let currentZ = baseZIndex;
  const updatedOthers = others.map((item) => {
    currentZ += 2;
    return { ...item, zIndex: currentZ };
  });

  if (activeItem) {
    currentZ += 2;
    return [...updatedOthers, { ...activeItem, zIndex: currentZ }] as T[];
  }

  return updatedOthers as T[];
}
