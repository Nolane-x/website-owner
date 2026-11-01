'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  GitBranch,
  History,
  Leaf,
  Map,
  Pause,
  Play,
  Plus,
  Save,
  Scale,
  Settings2,
  ShieldAlert,
  Sparkles,
  StepForward,
  Thermometer,
  Trash2,
  TreePine,
  Wind,
} from 'lucide-react';
import {
  BIOMES,
  DEFAULT_WORLD_RULES,
  SEASONS,
  SPECIES,
  WEATHER,
  compareLivingWorlds,
  createLivingWorld,
  deserializeLivingWorld,
  getLivingWorldStats,
  serializeLivingWorld,
  stepLivingWorld,
  type BiomeId,
  type LivingWorld,
  type LivingWorldStats,
  type SpeciesId,
  type WorldRules,
  type WorldEvent,
} from '@/lib/life-lab/living-world';

const ACTIVE_KEY = 'webos:evolution:living-world:v2';
const CHECKPOINT_KEY = 'webos:evolution:living-world-checkpoints:v2';
const EXPERIMENT_KEY = 'webos:evolution:living-world-experiments:v2';
const MAX_CHECKPOINTS = 12;
const MAX_EXPERIMENTS = 6;

type MapLayer = 'terrain' | 'food' | 'climate';

interface PopulationSample {
  generation: number;
  counts: Record<SpeciesId, number>;
}

interface WorldCheckpoint {
  id: string;
  name: string;
  generation: number;
  snapshot: string;
  note: string;
}

interface WorldExperiment {
  id: string;
  name: string;
  snapshot: string;
  generation: number;
  seed: number;
  savedAt: number;
}

function readInitialWorld(): LivingWorld {
  if (typeof window !== 'undefined') {
    try {
      const restored = deserializeLivingWorld(localStorage.getItem(ACTIVE_KEY));
      if (restored) return restored;
    } catch {
      // Start a clean deterministic world when local browser storage is unavailable.
    }
  }
  return createLivingWorld(20_261_101);
}

function readCheckpoints(): WorldCheckpoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw || raw.length > 2_800_000) return [];
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_CHECKPOINTS).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      if (typeof record.id !== 'string' || typeof record.snapshot !== 'string' || !deserializeLivingWorld(record.snapshot)) return [];
      return [{
        id: record.id.slice(0, 100),
        name: typeof record.name === 'string' ? record.name.slice(0, 64) : 'Mốc nghiên cứu',
        generation: typeof record.generation === 'number' && Number.isInteger(record.generation) ? Math.max(0, record.generation) : 0,
        snapshot: record.snapshot,
        note: typeof record.note === 'string' ? record.note.slice(0, 220) : '',
      }];
    });
  } catch {
    return [];
  }
}

function readExperiments(): WorldExperiment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPERIMENT_KEY);
    if (!raw || raw.length > 3_500_000) return [];
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_EXPERIMENTS).flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      if (typeof record.id !== 'string' || typeof record.snapshot !== 'string' || !deserializeLivingWorld(record.snapshot)) return [];
      return [{
        id: record.id.slice(0, 100),
        name: typeof record.name === 'string' ? record.name.trim().slice(0, 56) || 'Thí nghiệm không tên' : 'Thí nghiệm không tên',
        snapshot: record.snapshot,
        generation: typeof record.generation === 'number' && Number.isInteger(record.generation) ? Math.max(0, record.generation) : 0,
        seed: typeof record.seed === 'number' && Number.isInteger(record.seed) ? record.seed : 1,
        savedAt: typeof record.savedAt === 'number' && Number.isFinite(record.savedAt) ? record.savedAt : 0,
      }];
    });
  } catch {
    return [];
  }
}

function countSpecies(world: LivingWorld): Record<SpeciesId, number> {
  return getLivingWorldStats(world).counts;
}

function sampleWorld(world: LivingWorld): PopulationSample {
  return { generation: world.generation, counts: countSpecies(world) };
}

function drawLivingWorld(canvas: HTMLCanvasElement | null, world: LivingWorld, layer: MapLayer): void {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const cellWidth = canvas.width / world.width;
  const cellHeight = canvas.height / world.height;
  const biomeColors = ['#516d45', '#214f3d', '#9a8054', '#68767d', '#245c78', '#3e7161'];
  context.fillStyle = '#07110f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < world.biomes.length; index++) {
    const x = index % world.width;
    const y = Math.floor(index / world.width);
    context.fillStyle = biomeColors[world.biomes[index]] ?? biomeColors[0];
    context.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
    if (layer === 'food' && world.food[index] > 0) {
      const alpha = 0.13 + world.food[index] / 15 * 0.67;
      context.fillStyle = 'rgba(180, 255, 144,' + alpha.toFixed(2) + ')';
      context.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
    }
    if (layer === 'climate') {
      const heat = world.temperature[index];
      const humidity = world.humidity[index];
      context.fillStyle = heat > 170
        ? 'rgba(255, 104, 75,' + ((heat - 170) / 255 * 0.58).toFixed(2) + ')'
        : heat < 85
          ? 'rgba(99, 174, 255,' + ((85 - heat) / 255 * 0.56).toFixed(2) + ')'
          : 'rgba(94, 222, 195,' + (humidity / 255 * 0.22).toFixed(2) + ')';
      context.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
    }
  }

  if (layer === 'food') {
    for (let index = 0; index < world.detritus.length; index++) {
      if (world.detritus[index] === 0) continue;
      const x = index % world.width;
      const y = Math.floor(index / world.width);
      context.fillStyle = 'rgba(213, 173, 105,' + (0.15 + world.detritus[index] / 15 * 0.55).toFixed(2) + ')';
      context.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
    }
  }

  for (const animal of world.organisms) {
    const x = (animal.x + 0.5) * cellWidth;
    const y = (animal.y + 0.5) * cellHeight;
    const species = animal.species;
    const radius = Math.max(2, Math.min(cellWidth, cellHeight) * (
      species === 'hunter' ? 0.39 : species === 'microbe' ? 0.19 : species === 'parasite' ? 0.16 : 0.31
    ));
    if (species === 'parasite' && animal.hostId >= 0) {
      context.beginPath();
      context.arc(x + radius * 0.7, y - radius * 0.6, radius * 0.6, 0, Math.PI * 2);
      context.fillStyle = '#f3d16f';
      context.fill();
      continue;
    }
    const color = species === 'grazer' ? '#a9efba'
      : species === 'hunter' ? '#ff987c'
        : species === 'omnivore' ? '#e9bdff'
          : species === 'parasite' ? '#f3d16f' : '#80d8ee';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    if (species === 'hunter') {
      context.strokeStyle = '#572c26';
      context.lineWidth = Math.max(1.1, radius * 0.32);
      context.stroke();
    }
  }

  context.strokeStyle = 'rgba(235, 245, 238, 0.055)';
  context.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 8) {
    const px = Math.round(x * cellWidth) + 0.5;
    context.beginPath(); context.moveTo(px, 0); context.lineTo(px, canvas.height); context.stroke();
  }
  for (let y = 0; y <= world.height; y += 8) {
    const py = Math.round(y * cellHeight) + 0.5;
    context.beginPath(); context.moveTo(0, py); context.lineTo(canvas.width, py); context.stroke();
  }
}

function RuleSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-[9px] text-stone-400">
        <span>{label}</span>
        <span className="font-mono text-lime-200">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1.5 w-full accent-lime-300" />
    </label>
  );
}

function StatCard({ label, value, detail, tone = 'text-white' }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[8px] uppercase tracking-wider text-stone-600">{label}</p>
      <p className={'mt-1 font-mono text-lg font-semibold tabular-nums ' + tone}>{value}</p>
      <p className="mt-0.5 text-[8px] text-stone-600">{detail}</p>
    </div>
  );
}

function eventIcon(event: WorldEvent) {
  if (event.type === 'weather' || event.type === 'season') return <Wind className="h-3.5 w-3.5 text-sky-200" />;
  if (event.type === 'extinction' || event.type === 'crash') return <ShieldAlert className="h-3.5 w-3.5 text-rose-200" />;
  if (event.type === 'birth' || event.type === 'boom') return <Leaf className="h-3.5 w-3.5 text-lime-200" />;
  return <Activity className="h-3.5 w-3.5 text-amber-200" />;
}

function buildResearchNotes(world: LivingWorld, stats: LivingWorldStats): string[] {
  const notes: string[] = [];
  const tileCount = world.width * world.height;
  const foodPerTile = stats.foodUnits / Math.max(1, tileCount);
  if (foodPerTile < 1.2) notes.push('Nguồn thực vật đang khan hiếm. Nhóm ăn cỏ và ăn tạp có thể phải mở rộng vùng kiếm ăn hoặc suy giảm năng lượng.');
  else if (foodPerTile > 5.5) notes.push('Nguồn thực vật tương đối dồi dào. Điều kiện này có thể hỗ trợ tăng trưởng của động vật ăn cỏ và tạo thêm nguồn thức ăn gián tiếp cho thú săn.');
  if (world.weather === 'drought' || world.weather === 'heatwave') notes.push('Hạn hán/nắng nóng đang làm giảm tốc độ tái sinh và độ ẩm; các loài có chi phí trao đổi chất cao chịu áp lực lớn hơn.');
  if (world.weather === 'wildfire') notes.push('Cháy rừng đang làm suy giảm thảm thực vật cục bộ nhưng đồng thời bổ sung vật chất hữu cơ cho chu trình phân giải.');
  if (stats.counts.parasite > stats.counts.grazer + stats.counts.omnivore) notes.push('Ký sinh trùng đang đông hơn nhóm vật chủ tiềm năng. Theo dõi mức miễn dịch trung bình và tốc độ suy giảm năng lượng của vật chủ.');
  if (stats.counts.hunter > Math.max(1, stats.counts.grazer) * 0.42) notes.push('Áp lực săn mồi tương đối cao so với con mồi ăn cỏ; quần thể săn mồi có thể tự suy giảm nếu nguồn con mồi cạn kiệt.');
  if (stats.counts.microbe < 3 && stats.detritusUnits > 30) notes.push('Vật chất hữu cơ đang tích tụ trong khi vi sinh vật ít. Chu trình tái chế dinh dưỡng có nguy cơ chậm lại.');
  if (stats.diversity <= 2) notes.push('Độ đa dạng loài thấp. Một cú sốc môi trường có thể gây tác động dây chuyền lên toàn bộ hệ sinh thái.');
  if (stats.averageTraits.immunity < 0.25 && stats.counts.parasite > 0) notes.push('Miễn dịch di truyền trung bình thấp trong khi ký sinh trùng vẫn tồn tại; đây là một áp lực chọn lọc đáng theo dõi.');
  if (notes.length === 0) notes.push('Chưa có tín hiệu mất cân bằng nổi bật theo các ngưỡng phân tích đơn giản. Hãy tiếp tục chạy nhiều mùa để kiểm tra độ ổn định.');
  return notes.slice(0, 5);
}

export function LivingWorldLab({ onBack }: { onBack: () => void }) {
  const [world, setWorld] = useState<LivingWorld>(readInitialWorld);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(7);
  const [layer, setLayer] = useState<MapLayer>('terrain');
  const [stats, setStats] = useState<LivingWorldStats>(() => getLivingWorldStats(readInitialWorld()));
  const [populationHistory, setPopulationHistory] = useState<PopulationSample[]>(() => [sampleWorld(readInitialWorld())]);
  const [checkpoints, setCheckpoints] = useState<WorldCheckpoint[]>(readCheckpoints);
  const [experiments, setExperiments] = useState<WorldExperiment[]>(readExperiments);
  const [experimentName, setExperimentName] = useState('');
  const [seedInput, setSeedInput] = useState(() => String(readInitialWorld().seed));
  const [populations, setPopulations] = useState<Record<SpeciesId, number>>(() => {
    const initial = countSpecies(readInitialWorld());
    return initial;
  });
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [compareLeft, setCompareLeft] = useState('');
  const [compareRight, setCompareRight] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(world);
  const lastCheckpointRef = useRef(world.generation - (world.generation % 40));

  useEffect(() => {
    worldRef.current = world;
    drawLivingWorld(canvasRef.current, world, layer);
  }, [world, layer]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, serializeLivingWorld(worldRef.current));
    } catch {
      // The simulation continues in memory even when the browser quota is full.
    }
  }, [world]);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoints.slice(0, MAX_CHECKPOINTS)));
    } catch {
      // Keeping fewer local checkpoints is safer than disrupting the simulation.
    }
  }, [checkpoints]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPERIMENT_KEY, JSON.stringify(experiments.slice(0, MAX_EXPERIMENTS)));
    } catch {
      // Named experiments remain available for the current session.
    }
  }, [experiments]);

  useEffect(() => () => {
    try {
      localStorage.setItem(ACTIVE_KEY, serializeLivingWorld(worldRef.current));
    } catch {
      // Closing the desktop window should not interrupt the simulation.
    }
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
        const interval = Math.max(35, 1000 / (speed * 2.2));
        if (!lastStep) lastStep = now;
        if (now - lastStep >= interval) {
          const due = Math.min(3, Math.max(1, Math.floor((now - lastStep) / interval)));
          let next = worldRef.current;
          for (let index = 0; index < due; index++) next = stepLivingWorld(next);
          worldRef.current = next;
          drawLivingWorld(canvasRef.current, next, layer);
          lastStep = now;
          if (next.generation % 3 === 0) {
            const sample = sampleWorld(next);
            setPopulationHistory((current) => [...current.slice(-99), sample]);
          }
          if (next.generation >= lastCheckpointRef.current + 40 && next.generation % 40 === 0) {
            const snapshot = serializeLivingWorld(next);
            setCheckpoints((current) => [{
              id: 'auto-' + next.seed + '-' + next.generation,
              name: 'Tự động · G' + next.generation.toLocaleString('vi-VN'),
              generation: next.generation,
              snapshot,
              note: 'Mốc tự động để có thể khôi phục và rẽ nhánh thí nghiệm.',
            }, ...current].slice(0, MAX_CHECKPOINTS));
            lastCheckpointRef.current = next.generation;
          }
          if (now - lastHud >= 180) {
            setWorld(next);
            setStats(getLivingWorldStats(next));
            lastHud = now;
          }
        }
      }
      animationId = window.requestAnimationFrame(animate);
    };
    animationId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationId);
  }, [running, speed, layer]);

  const commitWorld = (next: LivingWorld) => {
    worldRef.current = next;
    setWorld(next);
    setStats(getLivingWorldStats(next));
    setPopulationHistory((current) => [...current.slice(-99), sampleWorld(next)]);
    try {
      localStorage.setItem(ACTIVE_KEY, serializeLivingWorld(next));
    } catch {
      // Active state remains available in memory.
    }
  };

  const pauseWorld = () => {
    setRunning(false);
    commitWorld(worldRef.current);
  };

  const createWorld = (seed: number) => {
    setRunning(false);
    const next = createLivingWorld(seed, 72, 44, populations);
    commitWorld(next);
    setSeedInput(String(next.seed));
    lastCheckpointRef.current = 0;
    setCheckpoints((current) => current);
  };

  const createRandomWorld = () => {
    const current = worldRef.current;
    const seed = (Math.imul(current.seed, 1_664_525) + 1_013_904_223 + current.generation) >>> 0 || 1;
    createWorld(seed);
  };

  const advanceOnce = () => {
    setRunning(false);
    commitWorld(stepLivingWorld(worldRef.current));
  };

  const updateRule = <K extends keyof WorldRules>(key: K, value: WorldRules[K]) => {
    const current = worldRef.current;
    commitWorld({ ...current, rules: { ...current.rules, [key]: value } });
  };

  const saveCheckpoint = () => {
    const current = worldRef.current;
    const snapshot = serializeLivingWorld(current);
    const checkpoint: WorldCheckpoint = {
      id: 'manual-' + current.seed + '-' + current.generation + '-' + current.rngState,
      name: 'Mốc thủ công · G' + current.generation.toLocaleString('vi-VN'),
      generation: current.generation,
      snapshot,
      note: 'Bạn đã chủ động đánh dấu trạng thái này để phân tích hoặc tạo nhánh mới.',
    };
    setCheckpoints((items) => [checkpoint, ...items.filter((item) => item.id !== checkpoint.id)].slice(0, MAX_CHECKPOINTS));
  };

  const forkCheckpoint = (checkpoint: WorldCheckpoint) => {
    const restored = deserializeLivingWorld(checkpoint.snapshot);
    if (!restored) return;
    setRunning(false);
    commitWorld(restored);
    lastCheckpointRef.current = restored.generation;
    const snapshot = serializeLivingWorld(restored);
    const branch: WorldExperiment = {
      id: 'branch-' + restored.seed + '-' + restored.generation + '-' + restored.rngState,
      name: 'Nhánh từ G' + restored.generation,
      snapshot,
      generation: restored.generation,
      seed: restored.seed,
      savedAt: Date.now(),
    };
    setExperiments((items) => [branch, ...items.filter((item) => item.id !== branch.id)].slice(0, MAX_EXPERIMENTS));
  };

  const loadExperiment = (experiment: WorldExperiment) => {
    const restored = deserializeLivingWorld(experiment.snapshot);
    if (!restored) return;
    setRunning(false);
    commitWorld(restored);
    lastCheckpointRef.current = restored.generation;
    setSeedInput(String(restored.seed));
    setPopulations(countSpecies(restored));
  };

  const saveExperiment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = experimentName.trim().slice(0, 56);
    if (!name) return;
    const current = worldRef.current;
    const snapshot = serializeLivingWorld(current);
    const experiment: WorldExperiment = {
      id: 'experiment-' + current.seed + '-' + current.generation + '-' + current.rngState,
      name,
      snapshot,
      generation: current.generation,
      seed: current.seed,
      savedAt: Date.now(),
    };
    setExperiments((items) => [experiment, ...items.filter((item) => item.name !== name)].slice(0, MAX_EXPERIMENTS));
    setExperimentName('');
  };

  const removeExperiment = (id: string) => setExperiments((items) => items.filter((item) => item.id !== id));
  const removeCheckpoint = (id: string) => setCheckpoints((items) => items.filter((item) => item.id !== id));

  const comparison = useMemo(() => {
    if (!compareLeft || !compareRight || compareLeft === compareRight) return null;
    const left = experiments.find((entry) => entry.id === compareLeft);
    const right = experiments.find((entry) => entry.id === compareRight);
    if (!left || !right) return null;
    const leftWorld = deserializeLivingWorld(left.snapshot);
    const rightWorld = deserializeLivingWorld(right.snapshot);
    if (!leftWorld || !rightWorld) return null;
    return { left, right, diff: compareLivingWorlds(leftWorld, rightWorld), a: getLivingWorldStats(leftWorld), b: getLivingWorldStats(rightWorld) };
  }, [compareLeft, compareRight, experiments]);

  const researchNotes = useMemo(() => buildResearchNotes(world, stats), [world, stats]);
  const maxPopulation = Math.max(1, ...populationHistory.map((sample) => Object.values(sample.counts).reduce((sum, value) => sum + value, 0)));
  const seasonName = SEASONS.find((entry) => entry.id === world.season)?.name ?? world.season;
  const weatherName = WEATHER.find((entry) => entry.id === world.weather)?.name ?? world.weather;
  const activeSpecies = SPECIES.filter((entry) => stats.counts[entry.id] > 0);

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100"><TreePine className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white sm:text-lg">Living World · Phòng nghiên cứu tiến hóa</h2>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-100">World simulation v2</span>
            </div>
            <p className="mt-0.5 text-[10px] text-stone-500">Địa hình, khí hậu, năm nhóm sinh vật và các nhánh lịch sử có thể tái lập</p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] text-stone-300 hover:bg-white/[0.08]"><ArrowLeft className="h-3.5 w-3.5" /> Evolution Lab cổ điển</button>
      </header>

      <div className="grid min-h-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="flex min-w-0 flex-col gap-3">
          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">SEED {world.seed} · {world.width} × {world.height}</p>
                <h3 className="mt-1 text-sm font-semibold text-white">Một thế giới đang sống</h3>
                <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-stone-500">Thực vật tái sinh theo sinh cảnh; các cá thể ăn, săn, trốn, tụ đàn, bảo vệ lãnh thổ, ký sinh và phân giải vật chất hữu cơ. Mùa và thời tiết thay đổi áp lực sinh tồn qua từng thế hệ.</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <Activity className="h-3.5 w-3.5 text-cyan-100" />
                <span className="font-mono text-sm font-semibold tabular-nums text-white">G{world.generation.toLocaleString('vi-VN')}</span>
                <span className="text-[8px] text-stone-500">{seasonName} · {weatherName}</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#050b0d]">
              <canvas ref={canvasRef} width={1152} height={704} role="img" aria-label="Bản đồ thế giới mô phỏng với sáu quần xã sinh thái và năm nhóm sinh vật" className="block h-auto max-h-[58vh] w-full object-contain" />
              <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[75%] flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/75 px-2.5 py-1.5 text-[8px] text-stone-200 backdrop-blur">
                {BIOMES.map((biome) => <span key={biome.id} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: biome.color }} />{biome.name}</span>)}
              </div>
              <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
                {([
                  ['terrain', 'Địa hình'],
                  ['food', 'Thức ăn'],
                  ['climate', 'Khí hậu'],
                ] as Array<[MapLayer, string]>).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setLayer(value)} aria-pressed={layer === value} className={layer === value ? 'rounded-md border border-cyan-200/35 bg-cyan-200/20 px-2 py-1 text-[8px] text-cyan-50' : 'rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[8px] text-stone-300 backdrop-blur'}>{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => running ? pauseWorld() : setRunning(true)} className={running ? 'inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-[10px] font-semibold text-amber-100' : 'inline-flex items-center gap-2 rounded-xl bg-cyan-200 px-4 py-2.5 text-[10px] font-semibold text-[#071216] hover:bg-cyan-100'}>
                {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}{running ? 'Tạm dừng' : 'Cho thế giới tiến hóa'}
              </button>
              <button type="button" onClick={advanceOnce} disabled={running} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300 disabled:opacity-40"><StepForward className="h-3.5 w-3.5" /> Một thế hệ</button>
              <button type="button" onClick={createRandomWorld} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] text-stone-300"><Plus className="h-3.5 w-3.5" /> Thế giới mới</button>
              <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <Activity className="h-3.5 w-3.5 text-cyan-100" />
                <span className="text-[9px] text-stone-500">Tốc độ</span>
                <input aria-label="Tốc độ mô phỏng thế giới" type="range" min={1} max={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="w-20 accent-cyan-200" />
                <span className="w-5 text-right font-mono text-[9px] text-stone-300">{speed}</span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Quần thể" value={stats.population.toLocaleString('vi-VN')} detail={stats.diversity + '/5 nhóm còn tồn tại'} tone="text-white" />
            <StatCard label="Thảm thực vật" value={stats.foodUnits.toLocaleString('vi-VN')} detail="Đơn vị thức ăn trên bản đồ" tone="text-lime-200" />
            <StatCard label="Sinh / tử" value={stats.births.toLocaleString('vi-VN') + ' / ' + stats.deaths.toLocaleString('vi-VN')} detail="Tổng tích lũy trong thế giới" tone="text-cyan-100" />
            <StatCard label="Năng lượng TB" value={stats.averageEnergy.toFixed(1)} detail="Mức năng lượng cá thể" tone="text-amber-100" />
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-[11px] font-semibold text-white">Dòng dân số qua thời gian</h3><p className="mt-1 text-[9px] text-stone-600">Tối đa 100 mẫu gần nhất · mỗi mẫu cách nhau khoảng ba thế hệ</p></div>
              <span className="font-mono text-[9px] text-stone-400">G{populationHistory[0]?.generation ?? world.generation} → G{world.generation}</span>
            </div>
            <div className="mt-4 flex h-28 items-end gap-[2px] overflow-hidden border-b border-white/10">
              {populationHistory.map((sample, index) => {
                const total = Object.values(sample.counts).reduce((sum, value) => sum + value, 0);
                return (
                  <div key={sample.generation + '-' + index} title={'G' + sample.generation + ' · ' + total + ' cá thể'} className="flex min-w-0 flex-1 flex-col justify-end overflow-hidden rounded-t-[2px]">
                    {SPECIES.map((species) => {
                      const value = sample.counts[species.id];
                      return value > 0 ? <div key={species.id} style={{ height: ((value / maxPopulation) * 100) + '%', backgroundColor: species.color, minHeight: '1px' }} /> : null;
                    })}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {SPECIES.map((species) => <span key={species.id} className="inline-flex items-center gap-1.5 text-[8px] text-stone-500"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: species.color }} />{species.short}: {stats.counts[species.id]}</span>)}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><History className="h-4 w-4 text-amber-100" /><h3 className="text-[11px] font-semibold text-white">Dòng thời gian sự kiện</h3></div>
              <span className="text-[8px] text-stone-600">Tối đa 64 sự kiện gần nhất trong trạng thái thế giới</span>
            </div>
            <div className="mt-3 space-y-2">
              {[...world.eventLog].reverse().slice(0, 8).map((event) => (
                <div key={event.id + '-' + event.generation} className="flex gap-2 rounded-lg border border-white/[0.06] bg-black/15 p-2.5">
                  <div className="mt-0.5">{eventIcon(event)}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] font-semibold text-stone-200">{event.title}</p><span className="font-mono text-[8px] text-stone-600">G{event.generation}</span></div><p className="mt-1 text-[8px] leading-relaxed text-stone-500">{event.detail}</p></div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="flex min-w-0 flex-col gap-3">
          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Map className="h-4 w-4 text-cyan-100" /><h3 className="text-[11px] font-semibold text-white">Bản đồ sinh cảnh</h3></div>
            <div className="mt-3 space-y-2">
              {BIOMES.map((biome, index) => {
                const count = world.biomes.reduce((sum, value) => sum + (value === index ? 1 : 0), 0);
                const percent = count / world.biomes.length * 100;
                return <div key={biome.id}><div className="flex items-center justify-between text-[8px]"><span className="flex items-center gap-1.5 text-stone-400"><span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: biome.color }} />{biome.name}</span><span className="font-mono text-stone-500">{percent.toFixed(1)}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full" style={{ width: percent + '%', backgroundColor: biome.color }} /></div></div>;
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-lime-100" /><h3 className="text-[11px] font-semibold text-white">Các nhóm sinh vật</h3></div>
            <div className="mt-3 space-y-2.5">
              {SPECIES.map((species) => (
                <div key={species.id} className="rounded-lg border border-white/[0.06] bg-black/15 p-2.5">
                  <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[9px] font-semibold text-stone-200"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: species.color }} />{species.name}</span><span className="font-mono text-[10px] text-white">{stats.counts[species.id]}</span></div>
                  <p className="mt-1 text-[8px] leading-relaxed text-stone-600">{species.role}</p>
                </div>
              ))}
            </div>
            {activeSpecies.length === 0 ? <p className="mt-3 text-[9px] text-rose-200">Không còn cá thể nào. Thế giới đã mất toàn bộ quần thể.</p> : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <button type="button" onClick={() => setSettingsOpen((value) => !value)} aria-expanded={settingsOpen} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-sky-100" /><span className="text-[11px] font-semibold text-white">Luật tự nhiên</span></span><span className="text-[8px] text-stone-600">{settingsOpen ? 'Thu gọn' : 'Điều chỉnh'}</span>
            </button>
            {settingsOpen ? <div className="mt-4 space-y-4">
              <RuleSlider label="Tốc độ tái sinh thực vật" value={world.rules.foodRegrowth} min={0.001} max={0.12} step={0.001} format={(v) => (v * 100).toFixed(1) + '%'} onChange={(v) => updateRule('foodRegrowth', v)} />
              <RuleSlider label="Chi phí trao đổi chất" value={world.rules.metabolism} min={0.3} max={3} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => updateRule('metabolism', v)} />
              <RuleSlider label="Tỷ lệ biến dị" value={world.rules.mutationRate} min={0} max={0.3} step={0.005} format={(v) => (v * 100).toFixed(1) + '%'} onChange={(v) => updateRule('mutationRate', v)} />
              <RuleSlider label="Ngưỡng năng lượng sinh sản" value={world.rules.reproductionThreshold} min={30} max={150} step={1} format={(v) => String(v)} onChange={(v) => updateRule('reproductionThreshold', v)} />
              <RuleSlider label="Áp lực săn mồi" value={world.rules.predationPressure} min={0.2} max={2.5} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => updateRule('predationPressure', v)} />
              <RuleSlider label="Áp lực dịch bệnh" value={world.rules.diseasePressure} min={0} max={2.5} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => updateRule('diseasePressure', v)} />
              <RuleSlider label="Cường độ khí hậu" value={world.rules.climateIntensity} min={0.3} max={2.5} step={0.05} format={(v) => v.toFixed(2) + '×'} onChange={(v) => updateRule('climateIntensity', v)} />
            </div> : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-orange-100" /><h3 className="text-[11px] font-semibold text-white">Khí hậu tại thời điểm này</h3></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-black/15 p-2.5"><p className="text-[8px] text-stone-600">Mùa</p><p className="mt-1 text-[10px] font-semibold text-white">{seasonName}</p></div>
              <div className="rounded-lg border border-white/[0.06] bg-black/15 p-2.5"><p className="text-[8px] text-stone-600">Thời tiết</p><p className="mt-1 text-[10px] font-semibold text-white">{weatherName}</p></div>
              <div className="rounded-lg border border-white/[0.06] bg-black/15 p-2.5"><p className="text-[8px] text-stone-600">Loài đa dạng</p><p className="mt-1 text-[10px] font-mono font-semibold text-cyan-100">{stats.diversity}/5</p></div>
              <div className="rounded-lg border border-white/[0.06] bg-black/15 p-2.5"><p className="text-[8px] text-stone-600">Ô đất phì nhiêu</p><p className="mt-1 text-[10px] font-mono font-semibold text-lime-100">{stats.fertileTiles}</p></div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-sky-100" /><h3 className="text-[11px] font-semibold text-white">Phân tích tín hiệu</h3></div>
            <p className="mt-2 text-[8px] leading-relaxed text-stone-600">Phân tích định tính từ trạng thái mô phỏng, không phải kiểm định nhân quả thống kê.</p>
            <div className="mt-3 space-y-2">
              {researchNotes.map((note, index) => <div key={index} className="flex gap-2 rounded-lg bg-black/15 p-2.5"><span className="mt-0.5 font-mono text-[8px] text-cyan-100">{index + 1}</span><p className="text-[8px] leading-relaxed text-stone-400">{note}</p></div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><History className="h-4 w-4 text-amber-100" /><h3 className="text-[11px] font-semibold text-white">Mốc thời gian & nhánh</h3></div><button type="button" onClick={() => setHistoryOpen((value) => !value)} className="text-[8px] text-stone-500">{historyOpen ? 'Thu gọn' : 'Mở'}</button></div>
            {historyOpen ? <>
              <button type="button" onClick={saveCheckpoint} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-[9px] font-semibold text-amber-100"><Save className="h-3.5 w-3.5" /> Lưu mốc nghiên cứu hiện tại</button>
              <p className="mt-2 text-[8px] leading-relaxed text-stone-600">Tự động lưu mỗi 40 thế hệ. Tối đa {MAX_CHECKPOINTS} mốc trên trình duyệt này.</p>
              <div className="mt-3 space-y-1.5">
                {checkpoints.map((checkpoint) => <div key={checkpoint.id} className="rounded-lg border border-white/[0.06] bg-black/15 p-2">
                  <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => forkCheckpoint(checkpoint)} className="min-w-0 flex-1 truncate text-left text-[9px] text-stone-200 hover:text-amber-100">{checkpoint.name}</button><span className="font-mono text-[8px] text-stone-600">G{checkpoint.generation}</span></div>
                  <div className="mt-1 flex items-center justify-between gap-2"><p className="min-w-0 truncate text-[8px] text-stone-600">{checkpoint.note}</p><button type="button" onClick={() => removeCheckpoint(checkpoint.id)} aria-label="Xóa mốc nghiên cứu" className="shrink-0 rounded p-1 text-stone-600 hover:text-rose-200"><Trash2 className="h-3 w-3" /></button></div>
                  <p className="mt-1 text-[8px] text-amber-100/70">Nhấn tên để khôi phục và tạo nhánh mới</p>
                </div>)}
                {checkpoints.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[8px] text-stone-600">Chưa có mốc nghiên cứu.</p> : null}
              </div>
            </> : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Save className="h-4 w-4 text-amber-100" /><h3 className="text-[11px] font-semibold text-white">Thư viện thí nghiệm</h3></div>
            <form onSubmit={saveExperiment} className="mt-3 flex gap-1.5">
              <input value={experimentName} onChange={(event) => setExperimentName(event.target.value)} maxLength={56} placeholder="Tên thí nghiệm..." aria-label="Tên thí nghiệm thế giới" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-[9px] text-white outline-none placeholder:text-stone-600" />
              <button type="submit" disabled={!experimentName.trim()} aria-label="Lưu thí nghiệm" className="rounded-lg bg-amber-200 px-3 text-[#1a160b] disabled:opacity-40"><Save className="h-3.5 w-3.5" /></button>
            </form>
            <p className="mt-2 text-[8px] text-stone-600">Tối đa {MAX_EXPERIMENTS} bản chụp cục bộ. Có thể tải lại để tiếp tục hoặc so sánh.</p>
            <div className="mt-3 space-y-1.5">
              {experiments.map((experiment) => <div key={experiment.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/15 p-2">
                <button type="button" onClick={() => loadExperiment(experiment)} className="min-w-0 flex-1 truncate text-left text-[9px] text-stone-300 hover:text-amber-100">{experiment.name} <span className="text-stone-600">· G{experiment.generation}</span></button>
                <button type="button" onClick={() => removeExperiment(experiment.id)} aria-label={'Xóa ' + experiment.name} className="rounded p-1 text-stone-600 hover:text-rose-200"><Trash2 className="h-3 w-3" /></button>
              </div>)}
              {experiments.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[8px] text-stone-600">Chưa lưu thí nghiệm nào.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-violet-100" /><h3 className="text-[11px] font-semibold text-white">So sánh hai thế giới</h3></div>
            <div className="mt-3 space-y-2">
              <label className="block text-[8px] text-stone-500">Thí nghiệm A<select value={compareLeft} onChange={(event) => setCompareLeft(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[9px] text-stone-200"><option value="">Chọn thí nghiệm</option>{experiments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block text-[8px] text-stone-500">Thí nghiệm B<select value={compareRight} onChange={(event) => setCompareRight(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[9px] text-stone-200"><option value="">Chọn thí nghiệm</option>{experiments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            </div>
            {comparison ? <div className="mt-3 rounded-lg border border-violet-200/15 bg-violet-200/[0.05] p-3">
              <p className="text-[9px] font-semibold text-violet-100">{comparison.left.name} ↔ {comparison.right.name}</p>
              <div className="mt-2 space-y-1.5 text-[8px]">
                <div className="flex justify-between"><span className="text-stone-500">Chênh lệch dân số</span><span className="font-mono text-white">{comparison.diff.populationDelta > 0 ? '+' : ''}{comparison.diff.populationDelta}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Đa dạng loài</span><span className="font-mono text-white">{comparison.a.diversity} → {comparison.b.diversity}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Thức ăn chênh lệch</span><span className="font-mono text-white">{comparison.diff.foodDelta > 0 ? '+' : ''}{comparison.diff.foodDelta}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Sinh / tử chênh lệch</span><span className="font-mono text-white">+{comparison.diff.birthDelta} / +{comparison.diff.deathDelta}</span></div>
                <div className="border-t border-white/10 pt-2">
                  {SPECIES.map((species) => <div key={species.id} className="flex justify-between py-0.5"><span className="text-stone-500">{species.short}</span><span className="font-mono text-stone-200">{comparison.diff.species[species.id] > 0 ? '+' : ''}{comparison.diff.species[species.id]}</span></div>)}
                </div>
              </div>
            </div> : <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[8px] text-stone-600">Lưu ít nhất hai thí nghiệm để xem chênh lệch.</p>}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-cyan-100" /><h3 className="text-[11px] font-semibold text-white">Điều kiện ban đầu</h3></div>
            <div className="mt-3 space-y-3">
              <label className="block text-[8px] text-stone-500">Seed<input value={seedInput} onChange={(event) => setSeedInput(event.target.value.replace(/[^0-9]/g, '').slice(0, 10))} inputMode="numeric" className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 font-mono text-[9px] text-white outline-none" /></label>
              {SPECIES.map((species) => <label key={species.id} className="block text-[8px] text-stone-500"><span className="flex justify-between">{species.short}<span className="font-mono" style={{ color: species.color }}>{populations[species.id]}</span></span><input type="range" min={0} max={species.id === 'hunter' || species.id === 'parasite' ? 50 : 100} value={populations[species.id]} onChange={(event) => setPopulations((current) => ({ ...current, [species.id]: Number(event.target.value) }))} className="mt-1 w-full accent-cyan-200" /></label>)}
              <button type="button" disabled={!seedInput || Number(seedInput) < 1} onClick={() => createWorld(Number(seedInput))} className="w-full rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-[9px] font-semibold text-cyan-50 disabled:opacity-40">Tạo hành tinh với cấu hình này</button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d191b] p-4">
            <div className="flex items-center gap-2"><Dna className="h-4 w-4 text-fuchsia-100" /><h3 className="text-[11px] font-semibold text-white">Hồ sơ gene trung bình</h3></div>
            <div className="mt-3 space-y-2">
              {([
                ['Trao đổi chất', stats.averageTraits.metabolism.toFixed(2)],
                ['Tầm nhìn', stats.averageTraits.vision.toFixed(1)],
                ['Sinh sản', (stats.averageTraits.fertility * 100).toFixed(1) + '%'],
                ['Tốc độ', stats.averageTraits.speed.toFixed(2)],
                ['Tính xã hội', (stats.averageTraits.sociality * 100).toFixed(0) + '%'],
                ['Hung tính', (stats.averageTraits.aggression * 100).toFixed(0) + '%'],
                ['Ngụy trang', (stats.averageTraits.camouflage * 100).toFixed(0) + '%'],
                ['Miễn dịch', (stats.averageTraits.immunity * 100).toFixed(0) + '%'],
                ['Hiệu quả thức ăn', stats.averageTraits.efficiency.toFixed(2)],
                ['Độc lực ký sinh', (stats.averageTraits.virulence * 100).toFixed(0) + '%'],
              ] as Array<[string, string]>).map(([label, value]) => <div key={label} className="flex items-center justify-between text-[8px]"><span className="text-stone-500">{label}</span><span className="font-mono text-stone-200">{value}</span></div>)}
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-[8px] leading-relaxed text-stone-600">Các giá trị là trung bình trên toàn bộ cá thể còn sống, không tách theo loài. Muốn kết luận gene nào được chọn lọc, cần so sánh cùng một loài qua nhiều mốc thời gian.</p>
          </section>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[8px] text-stone-600">
        <span>Living World · Mô phỏng cục bộ, không API · {world.width * world.height} ô địa hình · tối đa 420 cá thể</span>
        <span>{running ? 'Đang tiến hóa' : 'Đang tạm dừng'} · dữ liệu nằm trong browser profile này</span>
      </footer>
    </section>
  );
}
