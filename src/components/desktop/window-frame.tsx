'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WindowState } from '@/lib/types';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

interface WindowFrameProps {
  window: WindowState;
  children: React.ReactNode;
}

export function WindowFrame({ window: win, children }: WindowFrameProps) {
  const {
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    moveWindow,
    resizeWindow,
    snapWindow,
  } = useWindowManager();

  const isFocused = activeWindowId === win.id;
  const frameRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Resizing state
  const isResizingRef = useRef(false);
  const resizeDirRef = useRef<string | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>({ mouseX: 0, mouseY: 0, startX: 0, startY: 0, startW: 0, startH: 0 });

  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | null>(null);

  const handleTitlePointerDown = (e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0) return;
    focusWindow(win.id);

    // Don't drag if clicked on button
    if ((e.target as HTMLElement).closest('button')) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: win.position.x,
      startY: win.position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    const newX = dragStartRef.current.startX + deltaX;
    const newY = dragStartRef.current.startY + deltaY;

    // Detect screen edges for snap preview
    const screenW = window.innerWidth;
    if (e.clientX <= 20) {
      setSnapPreview('left');
    } else if (e.clientX >= screenW - 20) {
      setSnapPreview('right');
    } else {
      setSnapPreview(null);
    }

    moveWindow(win.id, newX, newY);
  };

  const handleTitlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture release throws
    }

    if (snapPreview) {
      snapWindow(win.id, snapPreview);
      setSnapPreview(null);
    }
  };

  // Resize handler
  const handleResizePointerDown = (dir: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    focusWindow(win.id);

    isResizingRef.current = true;
    resizeDirRef.current = dir;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: win.position.x,
      startY: win.position.y,
      startW: win.size.width,
      startH: win.size.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = useCallback((e: PointerEvent) => {
    if (!isResizingRef.current || !resizeDirRef.current) return;
    const dir = resizeDirRef.current;
    const deltaX = e.clientX - resizeStartRef.current.mouseX;
    const deltaY = e.clientY - resizeStartRef.current.mouseY;

    let newW = resizeStartRef.current.startW;
    let newH = resizeStartRef.current.startH;
    let newX = resizeStartRef.current.startX;
    let newY = resizeStartRef.current.startY;

    if (dir.includes('e')) newW = resizeStartRef.current.startW + deltaX;
    if (dir.includes('s')) newH = resizeStartRef.current.startH + deltaY;
    if (dir.includes('w')) {
      newW = resizeStartRef.current.startW - deltaX;
      newX = resizeStartRef.current.startX + deltaX;
    }
    if (dir.includes('n')) {
      newH = resizeStartRef.current.startH - deltaY;
      newY = resizeStartRef.current.startY + deltaY;
    }

    if (newW >= 380 && newH >= 260) {
      resizeWindow(win.id, newW, newH, newX, newY);
    }
  }, [win.id, resizeWindow]);

  const handleResizePointerUp = useCallback(() => {
    isResizingRef.current = false;
    resizeDirRef.current = null;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => handleResizePointerMove(e);
    const onUp = () => handleResizePointerUp();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [handleResizePointerMove, handleResizePointerUp]);

  if (win.isMinimized) return null;

  return (
    <div
      ref={frameRef}
      onPointerDown={() => focusWindow(win.id)}
      style={{
        transform: `translate3d(${win.position.x}px, ${win.position.y}px, 0)`,
        width: `${win.size.width}px`,
        height: `${win.size.height}px`,
        zIndex: win.zIndex,
      }}
      className={`fixed top-0 left-0 flex flex-col rounded-xl overflow-hidden transition-shadow select-none ${
        isFocused
          ? 'shadow-2xl shadow-black/80 ring-1 ring-emerald-500/40 bg-stone-900/95'
          : 'shadow-xl shadow-black/60 ring-1 ring-stone-800/80 bg-stone-900/90'
      } backdrop-blur-xl border border-stone-800/70`}
    >
      {/* Snap Indicator Overlay */}
      {snapPreview && (
        <div
          className={`absolute inset-0 pointer-events-none z-50 bg-emerald-500/10 border-2 border-dashed border-emerald-400 rounded-xl transition-all`}
        />
      )}

      {/* Titlebar */}
      <div
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={() => maximizeWindow(win.id)}
        className={`h-10 px-3 flex items-center justify-between border-b cursor-grab active:cursor-grabbing ${
          isFocused
            ? 'bg-stone-800/70 border-stone-700/60 text-stone-200'
            : 'bg-stone-900/80 border-stone-800/80 text-stone-400'
        } transition-colors`}
      >
        {/* Left Window Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => closeWindow(win.id)}
            title="Đóng cửa sổ"
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 flex items-center justify-center group transition"
          >
            <X className="w-2 h-2 text-rose-950 opacity-0 group-hover:opacity-100 transition" />
          </button>
          <button
            onClick={() => minimizeWindow(win.id)}
            title="Thu nhỏ xuống Dock"
            className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center group transition"
          >
            <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100 transition" />
          </button>
          <button
            onClick={() => maximizeWindow(win.id)}
            title={win.isMaximized ? 'Khôi phục kích thước' : 'Phóng to toàn màn hình'}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center group transition"
          >
            {win.isMaximized ? (
              <Square className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100 transition" />
            ) : (
              <Maximize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100 transition" />
            )}
          </button>
        </div>

        {/* Center Title */}
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide truncate max-w-[60%]">
          <span>{win.title}</span>
        </div>

        {/* Right Snap shortcuts */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => snapWindow(win.id, 'left')}
            title="Chia nửa màn hình trái"
            className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
          >
            ◧ Nửa trái
          </button>
          <button
            onClick={() => snapWindow(win.id, 'right')}
            title="Chia nửa màn hình phải"
            className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition"
          >
            ◨ Nửa phải
          </button>
        </div>
      </div>

      {/* Window Body (Scrollable application) */}
      <div className="flex-1 overflow-auto bg-stone-950/60 p-1 select-text">
        {children}
      </div>

      {/* Resize handles (8 directions) */}
      <div
        onPointerDown={(e) => handleResizePointerDown('e', e)}
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-emerald-500/20"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('w', e)}
        className="absolute top-0 left-0 w-2 h-full cursor-ew-resize hover:bg-emerald-500/20"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('s', e)}
        className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize hover:bg-emerald-500/20"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('n', e)}
        className="absolute top-0 left-0 w-full h-2 cursor-ns-resize hover:bg-emerald-500/20"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('se', e)}
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize hover:bg-emerald-500/30"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('sw', e)}
        className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize hover:bg-emerald-500/30"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('ne', e)}
        className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize hover:bg-emerald-500/30"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('nw', e)}
        className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize hover:bg-emerald-500/30"
      />
    </div>
  );
}
