export type LifeLabMode = 'life' | 'brain' | 'forest' | 'ant';

export interface LifeLabSimulation {
  mode: LifeLabMode;
  width: number;
  height: number;
  generation: number;
  cells: Uint8Array;
  antX: number;
  antY: number;
  antDirection: 0 | 1 | 2 | 3;
}

export interface LifeLabStats {
  total: number;
  active: number;
  density: number;
  states: number[];
}

export const LIFE_LAB_MODES: Array<{
  id: LifeLabMode;
  name: string;
  subtitle: string;
  description: string;
  rule: string;
}> = [
  {
    id: 'life',
    name: 'Game of Life',
    subtitle: 'Sự sống từ những quy tắc đơn giản',
    description: 'Các ô sống tồn tại, biến mất hoặc sinh ra tùy số hàng xóm. Những cấu trúc nhỏ có thể đứng yên, dao động hoặc di chuyển qua không gian.',
    rule: 'Sống sót khi có 2–3 hàng xóm. Ô chết sinh ra khi có đúng 3 hàng xóm.',
  },
  {
    id: 'brain',
    name: "Brian's Brain",
    subtitle: 'Xung thần kinh lan truyền',
    description: 'Mỗi ô đi qua ba trạng thái: yên lặng, phát xung và trơ. Hai xung lân cận có thể kích hoạt một ô mới.',
    rule: 'Ô đang phát xung chuyển sang trạng thái trơ; ô trơ trở về yên lặng. Ô yên lặng phát xung khi có đúng 2 xung lân cận.',
  },
  {
    id: 'forest',
    name: 'Forest Fire',
    subtitle: 'Một tia lửa có thể thay đổi cả khu rừng',
    description: 'Cây mọc chậm, lửa lan qua các cây lân cận và biến khu rừng thành khoảng trống. Một mồi lửa nhỏ có thể tạo ra phản ứng dây chuyền lớn.',
    rule: 'Lửa đốt cháy cây trong vùng lân cận với xác suất 32%. Rừng trống có thể mọc cây mới rất chậm.',
  },
  {
    id: 'ant',
    name: "Langton's Ant",
    subtitle: 'Một con kiến, một bảng màu, vô số hình dạng',
    description: 'Con kiến rẽ phải trên ô sáng, rẽ trái trên ô tối, đổi màu ô rồi tiến lên. Từ những chuyển động tưởng như hỗn loạn, một con đường có trật tự có thể xuất hiện.',
    rule: 'Ô sáng: rẽ phải rồi chuyển sang tối. Ô tối: rẽ trái rồi chuyển sang sáng. Kiến đi một ô sau mỗi lượt.',
  },
];

const MAX_DIMENSION = 180;

function clampDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(12, Math.min(MAX_DIMENSION, Math.floor(value)));
}

function indexOf(x: number, y: number, width: number): number {
  return y * width + x;
}

function countNeighbours(
  cells: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  wantedState: number,
): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (cells[indexOf(nx, ny, width)] === wantedState) count++;
    }
  }
  return count;
}

export function createEmptySimulation(
  mode: LifeLabMode,
  width = 120,
  height = 72,
): LifeLabSimulation {
  const safeWidth = clampDimension(width, 120);
  const safeHeight = clampDimension(height, 72);
  return {
    mode,
    width: safeWidth,
    height: safeHeight,
    generation: 0,
    cells: new Uint8Array(safeWidth * safeHeight),
    antX: Math.floor(safeWidth / 2),
    antY: Math.floor(safeHeight / 2),
    antDirection: 0,
  };
}

export function createSimulation(
  mode: LifeLabMode,
  width = 120,
  height = 72,
  random: () => number = Math.random,
): LifeLabSimulation {
  const state = createEmptySimulation(mode, width, height);
  const cells = new Uint8Array(state.cells.length);

  if (mode === 'life') {
    for (let i = 0; i < cells.length; i++) cells[i] = random() < 0.25 ? 1 : 0;
  } else if (mode === 'brain') {
    for (let i = 0; i < cells.length; i++) cells[i] = random() < 0.17 ? 1 : 0;
  } else if (mode === 'forest') {
    for (let i = 0; i < cells.length; i++) cells[i] = random() < 0.58 ? 1 : 0;
    cells[indexOf(state.antX, state.antY, state.width)] = 2;
  }

  return { ...state, cells };
}

export function clearSimulation(state: LifeLabSimulation): LifeLabSimulation {
  return {
    ...createEmptySimulation(state.mode, state.width, state.height),
    generation: 0,
  };
}

export function randomizeSimulation(
  state: LifeLabSimulation,
  random: () => number = Math.random,
): LifeLabSimulation {
  return createSimulation(state.mode, state.width, state.height, random);
}

export function paintSimulation(
  state: LifeLabSimulation,
  x: number,
  y: number,
  brushRadius = 0,
): LifeLabSimulation {
  const centerX = Math.max(0, Math.min(state.width - 1, Math.floor(x)));
  const centerY = Math.max(0, Math.min(state.height - 1, Math.floor(y)));
  const radius = Math.max(0, Math.min(4, Math.floor(brushRadius)));
  const cells = new Uint8Array(state.cells);
  const centerIndex = indexOf(centerX, centerY, state.width);

  if (state.mode === 'ant') {
    cells[centerIndex] = cells[centerIndex] === 0 ? 1 : 0;
    return { ...state, cells };
  }

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius + 0.5) continue;
      const px = centerX + dx;
      const py = centerY + dy;
      if (px < 0 || px >= state.width || py < 0 || py >= state.height) continue;
      const index = indexOf(px, py, state.width);
      const current = cells[index];
      if (state.mode === 'life') cells[index] = current === 1 ? 0 : 1;
      else if (state.mode === 'brain') cells[index] = (current + 1) % 3;
      else cells[index] = current === 1 ? 2 : current === 2 ? 0 : 1;
    }
  }
  return { ...state, cells };
}

function stepLife(state: LifeLabSimulation): LifeLabSimulation {
  const next = new Uint8Array(state.cells.length);
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const index = indexOf(x, y, state.width);
      const neighbours = countNeighbours(state.cells, state.width, state.height, x, y, 1);
      next[index] = state.cells[index] === 1
        ? (neighbours === 2 || neighbours === 3 ? 1 : 0)
        : (neighbours === 3 ? 1 : 0);
    }
  }
  return { ...state, cells: next, generation: state.generation + 1 };
}

function stepBrain(state: LifeLabSimulation): LifeLabSimulation {
  const next = new Uint8Array(state.cells.length);
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const index = indexOf(x, y, state.width);
      const current = state.cells[index];
      if (current === 1) next[index] = 2;
      else if (current === 2) next[index] = 0;
      else next[index] = countNeighbours(state.cells, state.width, state.height, x, y, 1) === 2 ? 1 : 0;
    }
  }
  return { ...state, cells: next, generation: state.generation + 1 };
}

function stepForest(state: LifeLabSimulation, random: () => number): LifeLabSimulation {
  const next = new Uint8Array(state.cells.length);
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const index = indexOf(x, y, state.width);
      const current = state.cells[index];
      if (current === 2) {
        next[index] = 0;
      } else if (current === 1) {
        const nearbyFire = countNeighbours(state.cells, state.width, state.height, x, y, 2) > 0;
        next[index] = nearbyFire && random() < 0.32 ? 2 : 1;
      } else {
        next[index] = random() < 0.0008 ? 1 : 0;
      }
    }
  }
  return { ...state, cells: next, generation: state.generation + 1 };
}

function stepAnt(state: LifeLabSimulation): LifeLabSimulation {
  const cells = new Uint8Array(state.cells);
  const index = indexOf(state.antX, state.antY, state.width);
  const wasDark = cells[index] === 1;

  let direction = state.antDirection;
  direction = ((direction + (wasDark ? 3 : 1)) % 4) as 0 | 1 | 2 | 3;
  cells[index] = wasDark ? 0 : 1;

  const offsets: Array<[number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const [dx, dy] = offsets[direction];
  const antX = (state.antX + dx + state.width) % state.width;
  const antY = (state.antY + dy + state.height) % state.height;

  return { ...state, cells, antX, antY, antDirection: direction, generation: state.generation + 1 };
}

export function stepSimulation(
  state: LifeLabSimulation,
  random: () => number = Math.random,
): LifeLabSimulation {
  switch (state.mode) {
    case 'life': return stepLife(state);
    case 'brain': return stepBrain(state);
    case 'forest': return stepForest(state, random);
    case 'ant': return stepAnt(state);
  }
}

export function getSimulationStats(state: LifeLabSimulation): LifeLabStats {
  const states = [0, 0, 0, 0];
  for (const cell of state.cells) if (cell < states.length) states[cell]++;
  const active = state.mode === 'forest'
    ? states[1] + states[2]
    : state.mode === 'ant'
      ? states[1]
      : states[1];
  return {
    total: state.cells.length,
    active,
    density: state.cells.length > 0 ? active / state.cells.length : 0,
    states,
  };
}

export function serializeSimulation(state: LifeLabSimulation): string {
  let cells = '';
  for (let i = 0; i < state.cells.length; i++) cells += String(state.cells[i]);
  return JSON.stringify({
    mode: state.mode,
    width: state.width,
    height: state.height,
    generation: state.generation,
    cells,
    antX: state.antX,
    antY: state.antY,
    antDirection: state.antDirection,
  });
}

export function deserializeSimulation(value: unknown): LifeLabSimulation | null {
  if (typeof value !== 'string' || value.length > 40_000) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const modes: LifeLabMode[] = ['life', 'brain', 'forest', 'ant'];
    if (!modes.includes(parsed.mode as LifeLabMode)) return null;
    if (!Number.isInteger(parsed.width) || !Number.isInteger(parsed.height)) return null;
    const width = clampDimension(Number(parsed.width), 120);
    const height = clampDimension(Number(parsed.height), 72);
    if (typeof parsed.cells !== 'string' || parsed.cells.length !== width * height) return null;
    const cells = new Uint8Array(width * height);
    const maxState = parsed.mode === 'brain' || parsed.mode === 'forest' ? 2 : 1;
    for (let i = 0; i < parsed.cells.length; i++) {
      const cell = parsed.cells.charCodeAt(i) - 48;
      if (!Number.isInteger(cell) || cell < 0 || cell > maxState) return null;
      cells[i] = cell;
    }
    const antDirection = parsed.antDirection;
    if (![0, 1, 2, 3].includes(Number(antDirection))) return null;
    return {
      mode: parsed.mode as LifeLabMode,
      width,
      height,
      generation: Number.isInteger(parsed.generation) && Number(parsed.generation) >= 0
        ? Math.min(10_000_000, Number(parsed.generation))
        : 0,
      cells,
      antX: Number.isInteger(parsed.antX) ? Math.max(0, Math.min(width - 1, Number(parsed.antX))) : Math.floor(width / 2),
      antY: Number.isInteger(parsed.antY) ? Math.max(0, Math.min(height - 1, Number(parsed.antY))) : Math.floor(height / 2),
      antDirection: Number(antDirection) as 0 | 1 | 2 | 3,
    };
  } catch {
    return null;
  }
}
