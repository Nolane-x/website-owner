'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playSound } from '@/lib/audio/sound-fx';
import { GraphNode, GraphEdge } from '@/lib/types';

interface CanvasNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const TYPE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  note: { fill: '#f59e0b', stroke: '#d97706', label: 'Ghi chú' },
  article: { fill: '#0ea5e9', stroke: '#0284c7', label: 'Bài viết' },
  project: { fill: '#10b981', stroke: '#059669', label: 'Dự án' },
  resource: { fill: '#8b5cf6', stroke: '#7c3aed', label: 'Tài nguyên' },
  link: { fill: '#a855f7', stroke: '#9333ea', label: 'Liên kết' },
  journal: { fill: '#f43f5e', stroke: '#e11d48', label: 'Nhật ký' },
  page: { fill: '#06b6d4', stroke: '#0891b2', label: 'Trang' },
};

export default function KnowledgeGraphPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Camera Pan & Zoom state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<CanvasNode | null>(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/graph');
      if (res.ok) {
        const data = await res.json();
        const rawNodes: GraphNode[] = data.nodes || [];
        const rawEdges: GraphEdge[] = data.edges || [];

        // Initialize node positions in a loose circular cluster
        const canvas = canvasRef.current;
        const width = canvas ? canvas.clientWidth : 800;
        const height = canvas ? canvas.clientHeight : 600;

        const initializedNodes: CanvasNode[] = rawNodes.map((n, i) => {
          const angle = (i / Math.max(1, rawNodes.length)) * Math.PI * 2;
          const radiusDist = 120 + Math.random() * 180;
          return {
            ...n,
            x: width / 2 + Math.cos(angle) * radiusDist,
            y: height / 2 + Math.sin(angle) * radiusDist,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.min(18, Math.max(8, 7 + (n.connectionsCount || 0) * 2.5)),
          };
        });

        setNodes(initializedNodes);
        setEdges(rawEdges);
      }
    } catch (err) {
      console.error('Lỗi nạp Knowledge Graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // Force-directed Physics Simulation & Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const simulateAndRender = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      // Physics Simulation Step
      const visibleNodes = filterType === 'all' ? nodes : nodes.filter((n) => n.type === filterType);
      const nodeMap = new Map<string, CanvasNode>();
      visibleNodes.forEach((n) => nodeMap.set(n.id, n));

      // 1. Repulsion between all nodes
      for (let i = 0; i < visibleNodes.length; i++) {
        for (let j = i + 1; j < visibleNodes.length; j++) {
          const n1 = visibleNodes[i];
          const n2 = visibleNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const force = 350 / distSq;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (draggedNodeRef.current !== n1) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (draggedNodeRef.current !== n2) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Spring attraction along edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 90;
          const springForce = (dist - targetDist) * 0.008;

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (draggedNodeRef.current !== source) {
            source.vx += fx;
            source.vy += fy;
          }
          if (draggedNodeRef.current !== target) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      }

      // 3. Center gravity & velocity damping
      const centerX = width / 2;
      const centerY = height / 2;
      for (const n of visibleNodes) {
        if (draggedNodeRef.current !== n) {
          n.vx += (centerX - n.x) * 0.0015;
          n.vy += (centerY - n.y) * 0.0015;

          n.vx *= 0.88; // Damping
          n.vy *= 0.88;

          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // Render Stage
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Apply Camera
      ctx.translate(cameraRef.current.x, cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

      // Draw Edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const isHighlighted =
            selectedNode && (selectedNode.id === source.id || selectedNode.id === target.id);

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = isHighlighted ? 'rgba(99, 102, 241, 0.7)' : 'rgba(120, 120, 140, 0.2)';
          ctx.lineWidth = isHighlighted ? 2 : 1;
          ctx.stroke();
        }
      }

      // Draw Nodes
      for (const n of visibleNodes) {
        const typeCfg = TYPE_COLORS[n.type] || TYPE_COLORS.note;
        const isSelected = selectedNode?.id === n.id;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ffffff' : typeCfg.fill;
        ctx.fill();

        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.strokeStyle = isSelected ? '#6366f1' : typeCfg.stroke;
        ctx.stroke();

        // Node Title Text
        ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(200, 205, 215, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(n.title, n.x, n.y + n.radius + 12);
      }

      ctx.restore();

      animId = requestAnimationFrame(simulateAndRender);
    };

    animId = requestAnimationFrame(simulateAndRender);
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, selectedNode, filterType]);

  // Pointer Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse coordinates to world coordinates
    const worldX = (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (mouseY - cameraRef.current.y) / cameraRef.current.zoom;

    // Check hit node
    const hitNode = nodes.find((n) => {
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (hitNode) {
      playSound('pop');
      setSelectedNode(hitNode);
      draggedNodeRef.current = hitNode;
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: mouseX - cameraRef.current.x, y: mouseY - cameraRef.current.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggedNodeRef.current) {
      const worldX = (mouseX - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (mouseY - cameraRef.current.y) / cameraRef.current.zoom;
      draggedNodeRef.current.x = worldX;
      draggedNodeRef.current.y = worldY;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
    } else if (isDraggingRef.current) {
      cameraRef.current.x = mouseX - dragStartRef.current.x;
      cameraRef.current.y = mouseY - dragStartRef.current.y;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  const handleZoom = (delta: number) => {
    playSound('pop');
    cameraRef.current.zoom = Math.max(0.3, Math.min(2.5, cameraRef.current.zoom + delta));
  };

  const handleResetCamera = () => {
    playSound('thock');
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
  };

  // Connected nodes of selectedNode
  const connectedEdges = selectedNode
    ? edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  const connectedNodeIds = new Set<string>();
  connectedEdges.forEach((e) => {
    connectedNodeIds.add(e.source === selectedNode?.id ? e.target : e.source);
  });
  const connectedNodes = nodes.filter((n) => connectedNodeIds.has(n.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Share2 className="text-[var(--accent)]" size={26} />
            Đồ thị Tri thức Cá nhân (Second Brain Knowledge Graph)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Trực quan hóa mạng lưới liên kết 2 chiều giữa các ghi chú, bài viết và dự án bằng canvas tương tác.
          </p>
        </div>

        {/* Legend / Filter */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[var(--text-muted)]" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">Tất cả loại ({nodes.length} nút)</option>
            {Object.entries(TYPE_COLORS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="relative rounded-2xl border border-[var(--border-color)] bg-[#090a0f] overflow-hidden shadow-2xl h-[650px] flex">
        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* Floating Canvas Controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-[var(--bg-surface)]/90 backdrop-blur-md p-1.5 rounded-xl border border-[var(--border-color)] shadow-lg z-10">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
            title="Phóng to"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
            title="Thu nhỏ"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
            title="Đặt lại khung nhìn"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 bg-[var(--bg-surface)]/80 backdrop-blur-md px-3 py-2 rounded-xl border border-[var(--border-color)] text-[11px] space-y-1.5 z-10 hidden sm:block">
          <div className="font-semibold text-xs text-[var(--text-primary)] mb-1">Loại nút</div>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(TYPE_COLORS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.fill }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-[var(--bg-surface)]/95 backdrop-blur-lg border border-[var(--border-color)] rounded-xl p-4 shadow-2xl space-y-3 z-10 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md text-white"
                style={{ backgroundColor: TYPE_COLORS[selectedNode.type]?.fill || '#6366f1' }}
              >
                {TYPE_COLORS[selectedNode.type]?.label || selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-snug">
                {selectedNode.title}
              </h3>
              {selectedNode.description && (
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                  {selectedNode.description}
                </p>
              )}
            </div>

            <div className="text-xs text-[var(--text-muted)] border-t border-[var(--border-color)] pt-2 space-y-1">
              <div>
                Tổng kết nối: <span className="font-mono font-bold text-[var(--accent)]">{selectedNode.connectionsCount || 0}</span>
              </div>
            </div>

            {/* Connected nodes list */}
            {connectedNodes.length > 0 && (
              <div className="pt-2 border-t border-[var(--border-color)] space-y-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Các trang liên kết ({connectedNodes.length}):
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {connectedNodes.map((cn) => (
                    <button
                      key={cn.id}
                      onClick={() => {
                        playSound('pop');
                        setSelectedNode(cn);
                      }}
                      className="w-full text-left p-1.5 rounded-md hover:bg-[var(--bg-surface-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between"
                    >
                      <span className="truncate">{cn.title}</span>
                      <ArrowRight size={12} className="shrink-0 text-[var(--text-muted)]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[var(--border-color)]">
              <Link href={`/admin/content/${selectedNode.id}`}>
                <Button size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs">
                  <ExternalLink size={13} />
                  Mở bài viết / Ghi chú
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
