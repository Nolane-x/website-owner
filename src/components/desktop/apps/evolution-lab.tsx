'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Dna,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  StepForward,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  createEcosystemWorld,
  deserializeEcosystem,
  getEcosystemStats,
  serializeEcosystem,
  stepEcosystem,
  type EcosystemRules,
  type EcosystemStats,
  type EcosystemWorld,
} from '@/lib/life-lab/ecosystem';

const ACTIVE_KEY = 'webos:life-lab:evolution:v1';
const EXPERIMENTS_KEY = 'webos:life-lab:evolution-experiments:v1';
const MAX_SAVED_EXPERIMENTS = 6;

interface SavedEcosystem {
  id: string;
  name: string;
  snapshot: string;
  updatedAt: number;
}

function readSavedExperiments(): SavedEcosystem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPERIMENTS_KEY);
    if (!raw || raw.length > 1_600_000) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_SAVED_EXPERIMENTS).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      if (typeof record.id !== 'string' || typeof record.name !== 'string' || typeof record.snapshot !== 'string') return [];
      if (record.snapshot.length > 240_000 || !deserializeEcosystem(record.snapshot)) return [];
      return [{
        id: record.id.slice(0, 80),
        name: record.name.trim().slice(0, 48) || 'Hệ sinh thái không tên',
        snapshot: record.snapshot,
        updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) ? record.updatedAt : 0,
      }];
    });
  } catch {
    return [];
  }
}

function readInitialWorld(): EcosystemWorld {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      const restored = deserializeEcosystem(raw);
      if (restored) return restored;
    } catch {
      // Start with a clean local world if browser storage is unavailable.
    }
  }
  return createEcosystemWorld(20_261_101);
}

function drawEcosystem(canvas: HTMLCanvasElement | null, world: EcosystemWorld): void {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const cellWidth = canvas.width / world.width;
  const cellHeight = canvas.height / world.height;
  context.fillStyle = '#07110f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const foodPalette = ['#07110f', '#1c503b', '#287b4e', '#43a86a'];
  for (let index = 0; index < world.food.length; index++) {
    const food = world.food[index];
    if (food === 0) continue;
    const x = index % world.width;
    const y = Math.floor(index / world.width);
    context.fillStyle = foodPalette[food];
    context.fillRect(
      Math.floor(x * cellWidth),
      Math.floor(y * cellHeight),
      Math.ceil(cellWidth),
      Math.ceil(cellHeight),
    );
  }

  for (const animal of world.organisms) {
    const x = (animal.x + 0.5) * cellWidth;
    const y = (animal.y + 0.5) * cellHeight;
    const radius = Math.max(2.8, Math.min(cellWidth, cellHeight) * (animal.species === 'hunter' ? 0.36 : 0.31));
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = animal.species === 'grazer' ? '#a8f0bd' : '#ff9d79';
    context.fill();
    context.lineWidth = Math.max(1, radius * 0.28);
    context.strokeStyle = animal.species === 'grazer' ? '#285d43' : '#723c31';
    context.stroke();

    if (animal.species === 'hunter') {
      context.beginPath();
      context.arc(x, y, Math.max(1, radius * 0.24), 0, Math.PI * 2);
      context.fillStyle = '#642d27';
      context.fill();
    }
  }

  context.strokeStyle = 'rgba(148, 163, 184, 0.045)';
  context.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 6) {
    const px = Math.round(x * cellWidth) + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= world.height; y += 6) {
    const py = Math.round(y * cellHeight) + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(canvas.width, py);
    context.stroke();
  }
}

function Metric({
  label,
  value,
  detail,
  tone = 'text-white',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[8px] uppercase tracking-wider text-stone-600">{label}</p>
      <p className={'mt-1 font-mono text-lg font-semibold tabular-nums ' + tone}>{value}</p>
      {detail ? <p className="mt-0.5 text-[8px] text-stone-600">{detail}</p> : null}
    </div>
  );
}

function RuleSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  display: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-[9px] text-stone-400">
        <span>{label}</span>
        <span className="font-mono text-emerald-200">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-emerald-400"
      />
    </label>
  );
}

export function EvolutionLab({ onBack }: { onBack: () => void }) {
  const [world, setWorld] = useState<EcosystemWorld>(readInitialWorld);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [stats, setStats] = useState<EcosystemStats>(() => getEcosystemStats(world));
  const [history, setHistory] = useState<number[]>(() => [getEcosystemStats(world).population]);
  const [saved, setSaved] = useState<SavedEcosystem[]>(readSavedExperiments);
  const [experimentName, setExperimentName] = useState('');
  const [seedInput, setSeedInput] = useState(() => String(world.seed));
  const [grazerInput, setGrazerInput] = useState(() => getEcosystemStats(world).grazers);
  const [hunterInput, setHunterInput] = useState(() => getEcosystemStats(world).hunters);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(world);

  useEffect(() => {
    worldRef.current = world;
    drawEcosystem(canvasRef.current, world);
  }, [world]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(saved.slice(0, MAX_SAVED_EXPERIMENTS)));
    } catch {
      // The active simulation remains usable even when storage is full.
    }
  }, [saved]);

  useEffect(() => () => {
    try {
      localStorage.setItem(ACTIVE_KEY, serializeEcosystem(worldRef.current));
    } catch {
      // Closing the app must not interrupt the simulation lifecycle.
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    let animationId = 0;
    let lastStep = 0;
    let lastStats = 0;
    const animate = (now: number) => {
      if (document.hidden) {
        lastStep = now;
      } else {
        const interval = Math.max(30, 1000 / (speed * 2));
        if (!lastStep) lastStep = now;
        if (now - lastStep >= interval) {
          const due = Math.min(4, Math.max(1, Math.floor((now - lastStep) / interval)));
          let next = worldRef.current;
          for (let index = 0; index < due; index++) next = stepEcosystem(next);
          worldRef.current = next;
          drawEcosystem(canvasRef.current, next);
          lastStep = now;
          if (now - lastStats >= 300) {
            const nextStats = getEcosystemStats(next);
            setStats(nextStats);
            setHistory((current) => [...current.slice(-79), nextStats.population]);
            lastStats = now;
          }
        }
      }
      animationId = window.requestAnimationFrame(animate);
    };
    animationId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationId);
  }, [running, speed]);

  const commitWorld = (next: EcosystemWorld) => {
    worldRef.current = next;
    setWorld(next);
    setStats(getEcosystemStats(next));
    setHistory((current) => [...current.slice(-79), next.organisms.length]);
  };

  const pause = () => {
    setRunning(false);
    const current = worldRef.current;
    commitWorld(current);
    try {
      localStorage.setItem(ACTIVE_KEY, serializeEcosystem(current));
    } catch {
      // The current in-memory world remains available.
    }
  };

  const newWorld = (seed: number) => {
    setRunning(false);
    const next = createEcosystemWorld(seed, 84, 48, grazerInput, hunterInput);
    commitWorld(next);
    setSeedInput(String(next.seed));
    try {
      localStorage.setItem(ACTIVE_KEY, serializeEcosystem(next));
    } catch {
      // Persistence is optional; simulation itself is local and available.
    }
  };

  const createRandomWorld = () => {
    newWorld(Date.now() >>> 0 || 1);
  };

  const stepOnce = () => {
    setRunning(false);
    const next = stepEcosystem(worldRef.current);
    commitWorld(next);
  };

  const updateRule = <K extends keyof EcosystemRules>(key: K, value: EcosystemRules[K]) => {
    const current = worldRef.current;
    commitWorld({ ...current, rules: { ...current.rules, [key]: value } });
  };

  const saveExperiment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = experimentName.trim().slice(0, 48);
    if (!name) return;
    const snapshot = serializeEcosystem(worldRef.current);
    const nextExperiment: SavedEcosystem = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'eco-' + Date.now().toString(36),
      name,
      snapshot,
      updatedAt: Date.now(),
    };
    setSaved((current) => [nextExperiment, ...current.filter((item) => item.name !== name)].slice(0, MAX_SAVED_EXPERIMENTS));
    setExperimentName('');
    try {
      localStorage.setItem(ACTIVE_KEY, snapshot);
    } catch {
      // Saved experiments still use their own bounded list.
    }
  };

  const loadExperiment = (experiment: SavedEcosystem) => {
    const restored = deserializeEcosystem(experiment.snapshot);
    if (!restored) return;
    setRunning(false);
    commitWorld(restored);
    const restoredStats = getEcosystemStats(restored);
    setSeedInput(String(restored.seed));
    setGrazerInput(restoredStats.grazers);
    setHunterInput(restoredStats.hunters);
    try {
      localStorage.setItem(ACTIVE_KEY, experiment.snapshot);
    } catch {
      // The restored world remains active in memory.
    }
  };

  const removeExperiment = (id: string) => {
    setSaved((current) => current.filter((item) => item.id !== id));
  };

  const currentRules = world.rules;
  const maxHistory = Math.max(1, ...history);
  const trend = history.length > 1 ? history[history.length - 1] - history[0] : 0;

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-lime-200">
            <Dna className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white sm:text-lg">Evolution Lab</h2>
              <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-lime-200">Agent-based ecology</span>
            </div>
            <p className="mt-0.5 text-[10px] text-stone-500">Một thế giới nhỏ, các cá thể riêng biệt và chọn lọc tự nhiên</p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] text-stone-300 hover:bg-white/[0.08]">
          <ArrowLeft className="h-3.5 w-3.5" /> Các mô phỏng tế bào
        </button>
      </header>

      <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <main className="flex min-w-0 flex-col gap-3">
          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-lime-200/80">Living world · Seed {world.seed}</p>
                <h3 className="mt-1 text-sm font-semibold text-white">Đồng cỏ và chuỗi săn mồi</h3>
                <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-stone-500">Sinh vật ăn cỏ tìm thức ăn và sinh vật săn mồi tìm con mồi. Năng lượng, tuổi thọ, gene và nguồn thức ăn quyết định quần thể nào tồn tại.</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
                <Activity className="h-3.5 w-3.5 text-lime-200" />
                <span className="font-mono text-sm font-semibold tabular-nums text-white">G{world.generation.toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#050b0d]">
              <canvas ref={canvasRef} width={1200} height={720} role="img" aria-label="Mô phỏng hệ sinh thái gồm thức ăn, sinh vật ăn cỏ và sinh vật săn mồi" className="block h-auto max-h-[56vh] w-full object-contain" />
              <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-[8px] text-stone-300 backdrop-blur">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#a8f0bd]" /> Ăn cỏ</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff9d79]" /> Săn mồi</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#43a86a]" /> Thức ăn</span>
              </div>
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-[8px] font-mono text-stone-300 backdrop-blur">
                {world.width} × {world.height}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => running ? pause() : setRunning(true)} className={running ? 'inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-[10px] font-semibold text-amber-200' : 'inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-[10px] font-semibold text-[#10160d] hover:bg-lime-200'}>
                {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                {running ? 'Tạm dừng' : 'Cho thế giới chạy'}
              </button>
              <button type="button" onClick={stepOnce} disabled={running} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300 disabled:opacity-40">
                <StepForward className="h-3.5 w-3.5" /> Một thế hệ
              </button>
              <button type="button" onClick={createRandomWorld} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300">
                <RotateCcw className="h-3.5 w-3.5" /> Thế giới mới
              </button>
              <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-lime-200" />
                <span className="text-[9px] text-stone-500">Tốc độ</span>
                <input aria-label="Tốc độ tiến hóa" type="range" min={1} max={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="w-20 accent-lime-300" />
                <span className="w-5 text-right font-mono text-[9px] text-stone-300">{speed}</span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Tổng quần thể" value={stats.population.toLocaleString('vi-VN')} detail={trend > 0 ? 'Đang tăng trong khung quan sát' : trend < 0 ? 'Đang giảm trong khung quan sát' : 'Chưa có xu hướng rõ'} tone="text-white" />
            <Metric label="Ăn cỏ" value={stats.grazers.toLocaleString('vi-VN')} detail="Nhóm tiêu thụ thực vật" tone="text-emerald-200" />
            <Metric label="Săn mồi" value={stats.hunters.toLocaleString('vi-VN')} detail="Nhóm săn sinh vật khác" tone="text-orange-200" />
            <Metric label="Thức ăn" value={stats.foodUnits.toLocaleString('vi-VN')} detail={stats.foodCells.toLocaleString('vi-VN') + ' ô có thức ăn'} tone="text-lime-200" />
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[11px] font-semibold text-white">Lịch sử quần thể</h3>
                <p className="mt-1 text-[9px] text-stone-600">80 mẫu gần nhất · Mỗi cột là một lần cập nhật quan sát</p>
              </div>
              <span className="font-mono text-[9px] text-stone-400">Sinh {stats.births.toLocaleString('vi-VN')} · Chết {stats.deaths.toLocaleString('vi-VN')}</span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-[2px] overflow-hidden border-b border-white/10">
              {history.map((population, index) => (
                <div key={index} title={'Quần thể: ' + population} className="min-w-0 flex-1 rounded-t-[2px] bg-lime-300/70" style={{ height: Math.max(3, (population / maxHistory) * 100) + '%' }} />
              ))}
            </div>
          </section>
        </main>

        <aside className="flex min-w-0 flex-col gap-3">
          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2">
              <Dna className="h-4 w-4 text-fuchsia-200" />
              <h3 className="text-[11px] font-semibold text-white">Dấu hiệu tiến hóa</h3>
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-[9px]"><span className="text-stone-500">Trao đổi chất trung bình</span><span className="font-mono text-white">{stats.averageMetabolism.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-[9px]"><span className="text-stone-500">Tầm nhìn trung bình</span><span className="font-mono text-white">{stats.averageVision.toFixed(1)} ô</span></div>
              <div className="flex items-center justify-between text-[9px]"><span className="text-stone-500">Tỷ lệ sinh sản trung bình</span><span className="font-mono text-white">{(stats.averageFertility * 100).toFixed(1)}%</span></div>
              <div className="flex items-center justify-between text-[9px]"><span className="text-stone-500">Năng lượng trung bình</span><span className="font-mono text-white">{stats.averageEnergy.toFixed(1)}</span></div>
              <div className="border-t border-white/10 pt-3 text-[9px] leading-relaxed text-stone-500">Gene được truyền từ cha mẹ sang con. Biến dị nhỏ tạo ra khác biệt; điều kiện sống quyết định biến dị nào có cơ hội tiếp tục tồn tại.</div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <button type="button" onClick={() => setSettingsOpen((value) => !value)} aria-expanded={settingsOpen} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-sky-200" /><span className="text-[11px] font-semibold text-white">Luật sinh thái</span></span>
              <span className="text-[9px] text-stone-500">{settingsOpen ? 'Thu gọn' : 'Mở điều chỉnh'}</span>
            </button>
            {settingsOpen ? (
              <div className="mt-4 space-y-4">
                <RuleSlider label="Tốc độ mọc thức ăn" value={currentRules.foodRegrowth} min={0.001} max={0.08} step={0.001} display={(currentRules.foodRegrowth * 100).toFixed(1) + '%'} onChange={(value) => updateRule('foodRegrowth', value)} />
                <RuleSlider label="Áp lực trao đổi chất" value={currentRules.metabolism} min={0.4} max={2.5} step={0.05} display={currentRules.metabolism.toFixed(2) + '×'} onChange={(value) => updateRule('metabolism', value)} />
                <RuleSlider label="Tần suất biến dị gene" value={currentRules.mutationRate} min={0} max={0.25} step={0.005} display={(currentRules.mutationRate * 100).toFixed(1) + '%'} onChange={(value) => updateRule('mutationRate', value)} />
                <RuleSlider label="Ngưỡng năng lượng sinh sản" value={currentRules.reproductionThreshold} min={35} max={120} step={1} display={String(currentRules.reproductionThreshold)} onChange={(value) => updateRule('reproductionThreshold', value)} />
                <RuleSlider label="Năng lượng nhận khi săn mồi" value={currentRules.predationEnergy} min={5} max={70} step={1} display={String(currentRules.predationEnergy)} onChange={(value) => updateRule('predationEnergy', value)} />
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-lime-200" /><h3 className="text-[11px] font-semibold text-white">Tạo điều kiện ban đầu</h3></div>
            <div className="mt-3 space-y-3">
              <label className="block text-[9px] text-stone-400">Seed thế giới<input value={seedInput} onChange={(event) => setSeedInput(event.target.value.replace(/[^0-9]/g, '').slice(0, 10))} inputMode="numeric" className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 font-mono text-[10px] text-white outline-none focus:border-lime-300/40" /></label>
              <label className="block text-[9px] text-stone-400"><span className="flex justify-between">Sinh vật ăn cỏ <span className="font-mono text-emerald-200">{grazerInput}</span></span><input type="range" min={0} max={120} value={grazerInput} onChange={(event) => setGrazerInput(Number(event.target.value))} className="mt-1.5 w-full accent-emerald-300" /></label>
              <label className="block text-[9px] text-stone-400"><span className="flex justify-between">Sinh vật săn mồi <span className="font-mono text-orange-200">{hunterInput}</span></span><input type="range" min={0} max={60} value={hunterInput} onChange={(event) => setHunterInput(Number(event.target.value))} className="mt-1.5 w-full accent-orange-300" /></label>
              <button type="button" disabled={!seedInput || Number(seedInput) < 1} onClick={() => newWorld(Number(seedInput))} className="w-full rounded-lg border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-[9px] font-semibold text-lime-100 disabled:opacity-40">Tạo lại với cấu hình này</button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Save className="h-4 w-4 text-amber-200" /><h3 className="text-[11px] font-semibold text-white">Lưu thí nghiệm</h3></div>
            <form onSubmit={saveExperiment} className="mt-3 flex gap-1.5">
              <input value={experimentName} onChange={(event) => setExperimentName(event.target.value)} maxLength={48} placeholder="Đặt tên thế giới..." aria-label="Tên hệ sinh thái" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-[9px] text-white outline-none placeholder:text-stone-600" />
              <button type="submit" disabled={!experimentName.trim()} aria-label="Lưu hệ sinh thái" className="rounded-lg bg-amber-300 px-3 text-[#17120a] disabled:opacity-40"><Save className="h-3.5 w-3.5" /></button>
            </form>
            <p className="mt-2 text-[8px] text-stone-600">Lưu tối đa {MAX_SAVED_EXPERIMENTS} bản chụp trên trình duyệt này.</p>
            {saved.length ? (
              <div className="mt-3 space-y-1.5">
                {saved.map((experiment) => (
                  <div key={experiment.id} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/15 p-2">
                    <button type="button" onClick={() => loadExperiment(experiment)} className="min-w-0 flex-1 truncate text-left text-[9px] text-stone-300 hover:text-lime-100">{experiment.name}</button>
                    <button type="button" onClick={() => removeExperiment(experiment.id)} aria-label={'Xóa ' + experiment.name} className="rounded p-1 text-stone-600 hover:text-rose-300"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[9px] text-stone-600">Chưa có thí nghiệm được lưu.</p>}
          </section>
        </aside>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[8px] text-stone-600">
        <span>Evolution Lab · Mô phỏng cục bộ · Không sử dụng API hay gửi dữ liệu ra ngoài</span>
        <span>{running ? 'Đang mô phỏng' : 'Đã tạm dừng'} · {world.width * world.height} ô · Tối đa 360 cá thể</span>
      </footer>
    </section>
  );
}
