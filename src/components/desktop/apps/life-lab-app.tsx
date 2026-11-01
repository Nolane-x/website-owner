'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Dna,
  Bug,
  Flame,
  Gauge,
  Grid3X3,
  Pause,
  Play,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  StepForward,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  LIFE_LAB_MODES,
  clearSimulation,
  createSimulation,
  deserializeSimulation,
  getSimulationStats,
  paintSimulation,
  randomizeSimulation,
  serializeSimulation,
  stepSimulation,
  type LifeLabMode,
  type LifeLabSimulation,
  type LifeLabStats,
} from '@/lib/life-lab/simulation';
import { EvolutionLab } from '@/components/desktop/apps/evolution-lab';

const STORAGE_KEY = 'webos:life-lab:v1';
const MAX_EXPERIMENTS = 8;

interface SavedExperiment {
  id: string;
  name: string;
  snapshot: string;
  updatedAt: number;
}

interface LifeLabPreferences {
  mode: LifeLabMode;
  speed: number;
  brushRadius: number;
  lastSnapshot: string | null;
  experiments: SavedExperiment[];
}

const DEFAULT_PREFERENCES: LifeLabPreferences = {
  mode: 'life',
  speed: 8,
  brushRadius: 1,
  lastSnapshot: null,
  experiments: [],
};

function readPreferences(): LifeLabPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 400_000) return DEFAULT_PREFERENCES;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const mode = LIFE_LAB_MODES.some((entry) => entry.id === value.mode)
      ? value.mode as LifeLabMode
      : DEFAULT_PREFERENCES.mode;
    const experiments = Array.isArray(value.experiments)
      ? value.experiments.slice(0, MAX_EXPERIMENTS).flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const record = item as Record<string, unknown>;
        if (typeof record.id !== 'string' || typeof record.name !== 'string' || typeof record.snapshot !== 'string') return [];
        if (record.snapshot.length > 40_000 || !deserializeSimulation(record.snapshot)) return [];
        return [{
          id: record.id.slice(0, 80),
          name: record.name.trim().slice(0, 48) || 'Thí nghiệm không tên',
          snapshot: record.snapshot,
          updatedAt: Number.isFinite(record.updatedAt) ? Number(record.updatedAt) : 0,
        }];
      })
      : [];
    const lastSnapshot = typeof value.lastSnapshot === 'string' && deserializeSimulation(value.lastSnapshot)
      ? value.lastSnapshot
      : null;
    return {
      mode,
      speed: Number.isFinite(value.speed) ? Math.max(1, Math.min(20, Math.round(Number(value.speed)))) : 8,
      brushRadius: Number.isFinite(value.brushRadius) ? Math.max(0, Math.min(3, Math.round(Number(value.brushRadius)))) : 1,
      lastSnapshot,
      experiments,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(value: LifeLabPreferences): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...value,
      experiments: value.experiments.slice(0, MAX_EXPERIMENTS),
    }));
    return true;
  } catch {
    return false;
  }
}

function drawWorld(canvas: HTMLCanvasElement | null, world: LifeLabSimulation): void {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const cellWidth = canvas.width / world.width;
  const cellHeight = canvas.height / world.height;
  context.fillStyle = '#081214';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const palettes: Record<LifeLabMode, string[]> = {
    life: ['#081214', '#72f1b0'],
    brain: ['#081214', '#7dd3fc', '#334155'],
    forest: ['#081214', '#43b879', '#ff985b'],
    ant: ['#081214', '#e8c77a'],
  };
  const palette = palettes[world.mode];

  for (let index = 0; index < world.cells.length; index++) {
    const state = world.cells[index];
    if (state === 0) continue;
    const x = index % world.width;
    const y = Math.floor(index / world.width);
    context.fillStyle = palette[state] ?? palette[1];
    context.fillRect(
      Math.floor(x * cellWidth),
      Math.floor(y * cellHeight),
      Math.ceil(cellWidth),
      Math.ceil(cellHeight),
    );
  }

  if (world.mode === 'ant') {
    const x = (world.antX + 0.5) * cellWidth;
    const y = (world.antY + 0.5) * cellHeight;
    context.fillStyle = '#fff7d6';
    context.beginPath();
    context.arc(x, y, Math.max(2.5, Math.min(cellWidth, cellHeight) * 0.38), 0, Math.PI * 2);
    context.fill();
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const [dx, dy] = directions[world.antDirection];
    context.strokeStyle = '#1f2937';
    context.lineWidth = Math.max(1.5, cellWidth * 0.16);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + dx * cellWidth * 0.32, y + dy * cellHeight * 0.32);
    context.stroke();
  }

  context.strokeStyle = 'rgba(148, 163, 184, 0.055)';
  context.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 10) {
    const px = Math.round(x * cellWidth) + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= world.height; y += 10) {
    const py = Math.round(y * cellHeight) + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(canvas.width, py);
    context.stroke();
  }
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export function LifeLabApp() {
  const [preferences, setPreferences] = useState<LifeLabPreferences>(readPreferences);
  const [simulation, setSimulation] = useState<LifeLabSimulation>(() =>
    deserializeSimulation(preferences.lastSnapshot ?? '') ?? createSimulation(preferences.mode),
  );
  const [running, setRunning] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'automata' | 'evolution'>('automata');
  const [hud, setHud] = useState<{ generation: number; stats: LifeLabStats }>(() => ({
    generation: simulation.generation,
    stats: getSimulationStats(simulation),
  }));
  const [experimentName, setExperimentName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef(simulation);
  const preferencesRef = useRef(preferences);
  const paintingRef = useRef(false);
  const paintModeRef = useRef<number | null>(null);

  const activeMode = useMemo(
    () => LIFE_LAB_MODES.find((entry) => entry.id === simulation.mode) ?? LIFE_LAB_MODES[0],
    [simulation.mode],
  );

  useEffect(() => {
    simulationRef.current = simulation;
    drawWorld(canvasRef.current, simulation);
  }, [simulation]);

  useEffect(() => {
    preferencesRef.current = preferences;
    persistPreferences(preferences);
  }, [preferences]);

  useEffect(() => () => {
    const world = simulationRef.current;
    persistPreferences({
      ...preferencesRef.current,
      mode: world.mode,
      lastSnapshot: serializeSimulation(world),
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    let animationId = 0;
    let lastStep = 0;
    let lastHud = 0;

    const animate = (now: number) => {
      if (document.hidden) {
        lastStep = now;
      } else {
        const interval = Math.max(33, 1000 / (preferences.speed * 3));
        if (!lastStep) lastStep = now;
        if (now - lastStep >= interval) {
          const due = Math.min(4, Math.max(1, Math.floor((now - lastStep) / interval)));
          let next = simulationRef.current;
          for (let i = 0; i < due; i++) next = stepSimulation(next);
          simulationRef.current = next;
          drawWorld(canvasRef.current, next);
          lastStep = now;
          if (now - lastHud >= 160) {
            setHud({ generation: next.generation, stats: getSimulationStats(next) });
            lastHud = now;
          }
        }
      }
      animationId = window.requestAnimationFrame(animate);
    };

    animationId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationId);
  }, [running, preferences.speed]);

  const commitWorld = (next: LifeLabSimulation, save = true) => {
    simulationRef.current = next;
    setSimulation(next);
    setHud({ generation: next.generation, stats: getSimulationStats(next) });
    if (save) {
      setPreferences((current) => ({
        ...current,
        mode: next.mode,
        lastSnapshot: serializeSimulation(next),
      }));
    }
  };

  const toggleRunning = () => {
    if (running) {
      setRunning(false);
      const world = simulationRef.current;
      setSimulation(world);
      setHud({ generation: world.generation, stats: getSimulationStats(world) });
      setPreferences((current) => ({
        ...current,
        mode: world.mode,
        lastSnapshot: serializeSimulation(world),
      }));
    } else {
      setRunning(true);
    }
  };

  const chooseMode = (mode: LifeLabMode) => {
    if (mode === simulationRef.current.mode) return;
    setRunning(false);
    const next = createSimulation(mode, simulationRef.current.width, simulationRef.current.height);
    commitWorld(next);
  };

  const stepOnce = () => {
    setRunning(false);
    commitWorld(stepSimulation(simulationRef.current));
  };

  const resetWorld = () => {
    setRunning(false);
    commitWorld(clearSimulation(simulationRef.current));
  };

  const randomizeWorld = () => {
    setRunning(false);
    commitWorld(randomizeSimulation(simulationRef.current));
  };

  const paintAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * simulationRef.current.width);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * simulationRef.current.height);
    const next = paintSimulation(
      simulationRef.current,
      x,
      y,
      preferencesRef.current.brushRadius,
      paintModeRef.current ?? undefined,
    );
    simulationRef.current = next;
    drawWorld(canvas, next);
  };

  const beginPaint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(simulationRef.current.width - 1,
      Math.floor(((event.clientX - bounds.left) / bounds.width) * simulationRef.current.width)));
    const y = Math.max(0, Math.min(simulationRef.current.height - 1,
      Math.floor(((event.clientY - bounds.top) / bounds.height) * simulationRef.current.height)));
    const current = simulationRef.current.cells[y * simulationRef.current.width + x];
    paintModeRef.current = current === 0 ? 1 : 0;
    paintingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    paintAt(event);
  };

  const savePaintedWorld = () => {
    const world = simulationRef.current;
    setSimulation(world);
    setHud({ generation: world.generation, stats: getSimulationStats(world) });
    setPreferences((current) => ({
      ...current,
      mode: world.mode,
      lastSnapshot: serializeSimulation(world),
    }));
  };

  const saveExperiment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = experimentName.trim().slice(0, 48);
    if (!name) return;
    const world = simulationRef.current;
    const experiment: SavedExperiment = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'experiment-' + Date.now().toString(36),
      name,
      snapshot: serializeSimulation(world),
      updatedAt: Date.now(),
    };
    setPreferences((current) => ({
      ...current,
      mode: world.mode,
      lastSnapshot: experiment.snapshot,
      experiments: [experiment, ...current.experiments].slice(0, MAX_EXPERIMENTS),
    }));
    setExperimentName('');
  };

  const loadExperiment = (experiment: SavedExperiment) => {
    const restored = deserializeSimulation(experiment.snapshot);
    if (!restored) return;
    setRunning(false);
    commitWorld(restored);
  };

  const removeExperiment = (id: string) => {
    setPreferences((current) => ({
      ...current,
      experiments: current.experiments.filter((entry) => entry.id !== id),
    }));
  };

  const currentStates = hud.stats.states;

  if (activeWorkspace === 'evolution') {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-[#081012] text-stone-200">
        <div className="mx-auto flex min-h-full max-w-[1500px] flex-col gap-4 p-3 sm:p-5">
          <EvolutionLab onBack={() => setActiveWorkspace('automata')} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#081012] text-stone-200">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col gap-4 p-3 sm:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">Life Lab</h1>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300">Local simulation</span>
              </div>
              <p className="mt-0.5 text-[10px] text-stone-500">Thử nghiệm các quy luật tạo nên thế giới sống</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] text-stone-400">
            <Activity className="h-3.5 w-3.5 text-emerald-300" />
            <span>{running ? 'Đang tiến hóa' : 'Đang tạm dừng'}</span>
            <span className="text-stone-700">/</span>
            <span className="font-mono">G{hud.generation.toLocaleString('vi-VN')}</span>
          </div>
          <button type="button" onClick={() => { if (running) toggleRunning(); setActiveWorkspace('evolution'); }} className="inline-flex items-center gap-2 rounded-xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-[9px] font-semibold text-lime-100 transition hover:bg-lime-300/15">
            <Dna className="h-3.5 w-3.5" /> Evolution Lab <span className="rounded bg-lime-200/15 px-1 py-0.5 text-[7px] uppercase tracking-wider">New</span>
          </button>
        </header>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Chọn thế giới mô phỏng">
          {LIFE_LAB_MODES.map((mode) => {
            const selected = simulation.mode === mode.id;
            const Icon = mode.id === 'life' ? Grid3X3 : mode.id === 'brain' ? BrainCircuit : mode.id === 'forest' ? Flame : Bug;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => chooseMode(mode.id)}
                aria-pressed={selected}
                className={selected
                  ? 'flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2.5 text-left text-emerald-200'
                  : 'flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-left text-stone-400 transition hover:border-white/20 hover:text-stone-200'}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-medium">{mode.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <main className="flex min-w-0 flex-col gap-3">
            <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Experiment {LIFE_LAB_MODES.findIndex((entry) => entry.id === simulation.mode) + 1}/4</p>
                  <h2 className="mt-1 text-sm font-semibold text-white">{activeMode.subtitle}</h2>
                  <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-stone-500">{activeMode.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-white">{hud.stats.active.toLocaleString('vi-VN')}</div>
                    <div className="text-[8px] text-stone-600">{simulation.mode === 'ant' ? 'Ô đã đổi màu' : 'Ô đang hoạt động'}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums text-white">{formatPercent(hud.stats.density)}</div>
                    <div className="text-[8px] text-stone-600">Mật độ</div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#050b0d]">
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={720}
                  role="img"
                  aria-label={activeMode.name + ' simulation. Click or drag to paint the world.'}
                  onPointerDown={beginPaint}
                  onPointerMove={(event) => {
                    if (paintingRef.current) paintAt(event);
                  }}
                  onPointerUp={(event) => {
                    const wasPainting = paintingRef.current;
                    paintingRef.current = false;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    if (wasPainting) savePaintedWorld();
                    paintModeRef.current = null;
                  }}
                  onPointerCancel={() => {
                    const wasPainting = paintingRef.current;
                    paintingRef.current = false;
                    if (wasPainting) savePaintedWorld();
                    paintModeRef.current = null;
                  }}
                  className="block h-auto max-h-[54vh] w-full touch-none cursor-crosshair object-contain"
                />
                <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1.5 text-[8px] text-stone-400 backdrop-blur">
                  Kéo chuột để gieo hoặc xóa ô
                </div>
                <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1.5 text-[8px] font-mono text-stone-400 backdrop-blur">
                  {simulation.width} × {simulation.height}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRunning}
                  className={running
                    ? 'inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-300/15'
                    : 'inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-[10px] font-semibold text-[#07110d] transition hover:bg-emerald-300'}
                >
                  {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  {running ? 'Tạm dừng' : 'Bắt đầu'}
                </button>
                <button type="button" onClick={stepOnce} disabled={running} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40">
                  <StepForward className="h-3.5 w-3.5" /> Một bước
                </button>
                <button type="button" onClick={randomizeWorld} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300 hover:bg-white/[0.08]">
                  <Shuffle className="h-3.5 w-3.5" /> Ngẫu nhiên
                </button>
                <button type="button" onClick={resetWorld} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300 hover:bg-white/[0.08]">
                  <RotateCcw className="h-3.5 w-3.5" /> Làm mới
                </button>
                <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <Gauge className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-[9px] text-stone-500">Tốc độ</span>
                  <input
                    aria-label="Tốc độ mô phỏng"
                    type="range"
                    min={1}
                    max={20}
                    value={preferences.speed}
                    onChange={(event) => setPreferences((current) => ({ ...current, speed: Number(event.target.value) }))}
                    className="w-20 accent-emerald-400"
                  />
                  <span className="w-5 text-right font-mono text-[9px] text-stone-300">{preferences.speed}</span>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[8px] uppercase tracking-wider text-stone-600">Thế hệ</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{hud.generation.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[8px] uppercase tracking-wider text-stone-600">Ô hoạt động</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-300">{hud.stats.active.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[8px] uppercase tracking-wider text-stone-600">Mật độ</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-sky-300">{formatPercent(hud.stats.density)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[8px] uppercase tracking-wider text-stone-600">Kích thước</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{hud.stats.total.toLocaleString('vi-VN')}</p>
              </div>
            </section>
          </main>

          <aside className="flex min-w-0 flex-col gap-3">
            <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <h3 className="text-[11px] font-semibold text-white">Quy luật thế giới</h3>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-stone-400">{activeMode.rule}</p>
              <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between text-[9px] text-stone-500">
                  <span>Trạng thái 0</span><span className="font-mono text-stone-300">{currentStates[0].toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-black/30">
                  <div className="h-full bg-stone-600" style={{ width: formatPercent(currentStates[0] / Math.max(1, hud.stats.total)) }} />
                </div>
                {currentStates.slice(1, 3).map((count, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between text-[9px] text-stone-500">
                      <span>Trạng thái {index + 1}</span><span className="font-mono text-stone-300">{count.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-black/30">
                      <div className={index === 0 ? 'h-full bg-emerald-400' : 'h-full bg-sky-400'} style={{ width: formatPercent(count / Math.max(1, hud.stats.total)) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-amber-300" />
                <h3 className="text-[11px] font-semibold text-white">Lưu thí nghiệm</h3>
              </div>
              <form onSubmit={saveExperiment} className="mt-3 flex gap-1.5">
                <input
                  value={experimentName}
                  onChange={(event) => setExperimentName(event.target.value)}
                  maxLength={48}
                  placeholder="Đặt tên thế giới..."
                  aria-label="Tên thí nghiệm"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-[9px] text-white outline-none placeholder:text-stone-600 focus:border-emerald-400/40"
                />
                <button type="submit" disabled={!experimentName.trim()} aria-label="Lưu thí nghiệm" className="rounded-lg bg-emerald-400 px-3 text-[#07110d] disabled:opacity-40">
                  <Save className="h-3.5 w-3.5" />
                </button>
              </form>
              <p className="mt-2 text-[8px] text-stone-600">Lưu tối đa {MAX_EXPERIMENTS} thế giới trên thiết bị này.</p>
              {preferences.experiments.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {preferences.experiments.map((experiment) => (
                    <div key={experiment.id} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/15 p-2">
                      <button type="button" onClick={() => loadExperiment(experiment)} className="min-w-0 flex-1 truncate text-left text-[9px] text-stone-300 hover:text-emerald-200" title="Mở thí nghiệm">
                        {experiment.name}
                      </button>
                      <button type="button" onClick={() => removeExperiment(experiment.id)} aria-label={'Xóa ' + experiment.name} className="rounded p-1 text-stone-600 hover:bg-white/5 hover:text-rose-300">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[9px] text-stone-600">Chưa có thí nghiệm đã lưu.</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-sky-300" />
                <h3 className="text-[11px] font-semibold text-white">Bảng điều khiển</h3>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[9px] text-stone-500">
                  <label htmlFor="life-lab-brush">Cỡ bút</label>
                  <span>{preferences.brushRadius * 2 + 1} × {preferences.brushRadius * 2 + 1}</span>
                </div>
                <input
                  id="life-lab-brush"
                  type="range"
                  min={0}
                  max={3}
                  value={preferences.brushRadius}
                  onChange={(event) => setPreferences((current) => ({ ...current, brushRadius: Number(event.target.value) }))}
                  className="mt-2 w-full accent-sky-400"
                />
              </div>
              <p className="mt-3 text-[9px] leading-relaxed text-stone-600">Chạm hoặc kéo trên lưới để thay đổi trạng thái các ô. Tốc độ thấp phù hợp khi quan sát từng quá trình chuyển tiếp.</p>
            </section>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[8px] text-stone-600">
          <span>Life Lab · Mô phỏng hoàn toàn trong trình duyệt · Không gửi dữ liệu ra ngoài</span>
          <span className="inline-flex items-center gap-1.5"><Activity className="h-3 w-3 text-emerald-400" /> {running ? 'Đang chạy' : 'Sẵn sàng'}</span>
        </footer>
      </div>
    </div>
  );
}
