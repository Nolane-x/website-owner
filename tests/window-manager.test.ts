import { describe, it, expect } from 'vitest';
import {
  createDefaultWindow,
  clampPosition,
  calculateSnapBounds,
  reorderZIndices,
} from '../src/lib/desktop/window-utils';

describe('Window Manager Runtime Utilities', () => {
  it('tạo cửa sổ mặc định với thông số hợp lệ', () => {
    const win = createDefaultWindow({
      id: 'win-1',
      appId: 'tasks',
      title: 'Quản lý công việc Kanban',
    });

    expect(win.id).toBe('win-1');
    expect(win.appId).toBe('tasks');
    expect(win.title).toBe('Quản lý công việc Kanban');
    expect(win.isMinimized).toBe(false);
    expect(win.isMaximized).toBe(false);
    expect(win.position.x).toBeGreaterThanOrEqual(0);
    expect(win.position.y).toBeGreaterThanOrEqual(0);
    expect(win.size.width).toBeGreaterThanOrEqual(400);
    expect(win.size.height).toBeGreaterThanOrEqual(300);
  });

  it('giới hạn tọa độ kéo thả không để cửa sổ lọt ra ngoài màn hình', () => {
    const screenWidth = 1920;
    const screenHeight = 1080;
    const winSize = { width: 800, height: 600 };

    // Kéo quá đà sang trái / trên
    const clampedNegative = clampPosition({ x: -200, y: -50 }, winSize, screenWidth, screenHeight);
    expect(clampedNegative.x).toBe(0);
    expect(clampedNegative.y).toBe(32); // Safe margin dưới topbar

    // Kéo quá đà sang phải / dưới
    const clampedOverflow = clampPosition({ x: 1900, y: 1000 }, winSize, screenWidth, screenHeight);
    expect(clampedOverflow.x).toBeLessThanOrEqual(screenWidth - 100);
    expect(clampedOverflow.y).toBeLessThanOrEqual(screenHeight - 80);
  });

  it('tính toán Snap nửa trái và nửa phải chính xác', () => {
    const screenWidth = 1600;
    const screenHeight = 900;
    const topBarHeight = 36;
    const dockHeight = 64;

    const leftSnap = calculateSnapBounds('left', screenWidth, screenHeight, topBarHeight, dockHeight);
    expect(leftSnap.x).toBe(0);
    expect(leftSnap.y).toBe(topBarHeight);
    expect(leftSnap.width).toBe(screenWidth / 2);
    expect(leftSnap.height).toBe(screenHeight - topBarHeight - dockHeight);

    const rightSnap = calculateSnapBounds('right', screenWidth, screenHeight, topBarHeight, dockHeight);
    expect(rightSnap.x).toBe(screenWidth / 2);
    expect(rightSnap.y).toBe(topBarHeight);
    expect(rightSnap.width).toBe(screenWidth / 2);
    expect(rightSnap.height).toBe(screenHeight - topBarHeight - dockHeight);
  });

  it('sắp xếp lại thứ tự z-index khi kích hoạt tiêu điểm cửa sổ', () => {
    const initialWindows = [
      { id: 'win-1', zIndex: 10 },
      { id: 'win-2', zIndex: 20 },
      { id: 'win-3', zIndex: 15 },
    ];

    // Khi chọn win-1, win-1 phải có zIndex cao nhất
    const updated = reorderZIndices(initialWindows, 'win-1');
    const win1 = updated.find((w) => w.id === 'win-1');
    const win2 = updated.find((w) => w.id === 'win-2');

    expect(win1?.zIndex).toBeGreaterThan(win2?.zIndex || 0);
  });
});
