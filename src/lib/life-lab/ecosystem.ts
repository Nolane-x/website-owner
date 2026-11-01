export type EcosystemSpecies = 'grazer' | 'hunter';

export interface EcosystemGenome {
  metabolism: number;
  vision: number;
  fertility: number;
}

export interface EcosystemOrganism {
  id: number;
  species: EcosystemSpecies;
  x: number;
  y: number;
  energy: number;
  age: number;
  genome: EcosystemGenome;
}

export interface EcosystemRules {
  foodRegrowth: number;
  metabolism: number;
  mutationRate: number;
  reproductionThreshold: number;
  predationEnergy: number;
}

export interface EcosystemWorld {
  width: number;
  height: number;
  generation: number;
  seed: number;
  rngState: number;
  nextId: number;
  food: Uint8Array;
  organisms: EcosystemOrganism[];
  births: number;
  deaths: number;
  rules: EcosystemRules;
}

export interface EcosystemStats {
  population: number;
  grazers: number;
  hunters: number;
  foodCells: number;
  foodUnits: number;
  averageEnergy: number;
  averageMetabolism: number;
  averageVision: number;
  averageFertility: number;
  births: number;
  deaths: number;
  predatorPreyRatio: number;
}

export const DEFAULT_ECOSYSTEM_RULES: EcosystemRules = {
  foodRegrowth: 0.016,
  metabolism: 1,
  mutationRate: 0.08,
  reproductionThreshold: 88,
  predationEnergy: 36,
};

const MIN_WIDTH = 24;
const MAX_WIDTH = 120;
const MIN_HEIGHT = 16;
const MAX_HEIGHT = 80;
const MAX_CELLS = 9_600;
const MAX_POPULATION = 360;
const MAX_SNAPSHOT_LENGTH = 240_000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeDimension(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.floor(clamp(value, min, max));
}

function createRandom(seed: number) {
  let state = seed >>> 0 || 0x6d2b79f5;
  return {
    next() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4_294_967_296;
    },
    get state() {
      return state >>> 0;
    },
  };
}

function cellIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

function wrap(value: number, size: number): number {
  return (value % size + size) % size;
}

function wrappedDelta(from: number, to: number, size: number): number {
  const direct = to - from;
  if (Math.abs(direct) <= size / 2) return direct;
  return direct > 0 ? direct - size : direct + size;
}

function randomGenome(species: EcosystemSpecies, random: () => number): EcosystemGenome {
  return species === 'grazer'
    ? {
        metabolism: 0.72 + random() * 0.38,
        vision: 3 + Math.floor(random() * 4),
        fertility: 0.025 + random() * 0.025,
      }
    : {
        metabolism: 0.95 + random() * 0.45,
        vision: 4 + Math.floor(random() * 5),
        fertility: 0.012 + random() * 0.018,
      };
}

function mutateGenome(genome: EcosystemGenome, rate: number, random: () => number): EcosystemGenome {
  const mutate = (value: number, min: number, max: number) => {
    const factor = 1 + (random() * 2 - 1) * rate;
    return clamp(value * factor, min, max);
  };
  const vision = random() < rate
    ? genome.vision + (random() < 0.5 ? -1 : 1)
    : genome.vision;
  return {
    metabolism: mutate(genome.metabolism, 0.45, 1.6),
    vision: clamp(Math.round(vision), 2, 10),
    fertility: mutate(genome.fertility, 0.008, 0.065),
  };
}

function findEmptyPosition(
  width: number,
  height: number,
  occupied: Uint8Array,
  random: () => number,
): { x: number; y: number } | null {
  const total = width * height;
  for (let attempt = 0; attempt < Math.min(total, 180); attempt++) {
    const index = Math.floor(random() * total);
    if (occupied[index] === 0) {
      occupied[index] = 1;
      return { x: index % width, y: Math.floor(index / width) };
    }
  }
  for (let index = 0; index < total; index++) {
    if (occupied[index] === 0) {
      occupied[index] = 1;
      return { x: index % width, y: Math.floor(index / width) };
    }
  }
  return null;
}

export function createEcosystemWorld(
  seed = 20_261_101,
  width = 84,
  height = 48,
  grazerCount = 34,
  hunterCount = 7,
): EcosystemWorld {
  const safeWidth = safeDimension(width, MIN_WIDTH, MAX_WIDTH, 84);
  const safeHeight = safeDimension(height, MIN_HEIGHT, MAX_HEIGHT, 48);
  const scale = Math.min(1, MAX_CELLS / (safeWidth * safeHeight));
  const finalWidth = scale < 1 ? Math.max(MIN_WIDTH, Math.floor(safeWidth * Math.sqrt(scale))) : safeWidth;
  const finalHeight = Math.min(safeHeight, Math.floor(MAX_CELLS / finalWidth));
  const total = finalWidth * finalHeight;
  const normalizedSeed = (Math.floor(Number.isFinite(seed) ? seed : 1) >>> 0) || 1;
  const random = createRandom(normalizedSeed);
  const food = new Uint8Array(total);

  for (let index = 0; index < total; index++) {
    food[index] = random.next() < 0.72 ? 1 + Math.floor(random.next() * 3) : 0;
  }

  const occupied = new Uint8Array(total);
  const organisms: EcosystemOrganism[] = [];
  let nextId = 1;
  const desiredGrazers = Math.floor(clamp(grazerCount, 0, 240));
  const desiredHunters = Math.floor(clamp(hunterCount, 0, 100));
  const totalRequested = Math.min(MAX_POPULATION, desiredGrazers + desiredHunters);

  const addOrganism = (species: EcosystemSpecies) => {
    if (organisms.length >= totalRequested) return;
    const position = findEmptyPosition(finalWidth, finalHeight, occupied, random.next);
    if (!position) return;
    organisms.push({
      id: nextId++,
      species,
      ...position,
      energy: species === 'grazer' ? 62 + random.next() * 28 : 68 + random.next() * 24,
      age: Math.floor(random.next() * 12),
      genome: randomGenome(species, random.next),
    });
  };

  for (let index = 0; index < desiredGrazers && organisms.length < totalRequested; index++) addOrganism('grazer');
  for (let index = 0; index < desiredHunters && organisms.length < totalRequested; index++) addOrganism('hunter');

  return {
    width: finalWidth,
    height: finalHeight,
    generation: 0,
    seed: normalizedSeed,
    rngState: random.state,
    nextId,
    food,
    organisms,
    births: 0,
    deaths: 0,
    rules: { ...DEFAULT_ECOSYSTEM_RULES },
  };
}

function findFoodTarget(
  animal: EcosystemOrganism,
  food: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number; score: number } | null = null;
  const vision = animal.genome.vision;
  for (let dy = -vision; dy <= vision; dy++) {
    for (let dx = -vision; dx <= vision; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > vision) continue;
      const x = wrap(animal.x + dx, width);
      const y = wrap(animal.y + dy, height);
      const amount = food[cellIndex(x, y, width)];
      if (amount === 0) continue;
      const score = amount * 4 - distance;
      if (!best || score > best.score) best = { x, y, score };
    }
  }
  return best;
}

function findPreyTarget(
  animal: EcosystemOrganism,
  organisms: EcosystemOrganism[],
  alive: boolean[],
  occupancy: Int16Array,
  width: number,
  height: number,
): { x: number; y: number; distance: number } | null {
  let best: { x: number; y: number; distance: number } | null = null;
  const vision = animal.genome.vision;
  for (let dy = -vision; dy <= vision; dy++) {
    for (let dx = -vision; dx <= vision; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > vision) continue;
      const x = wrap(animal.x + dx, width);
      const y = wrap(animal.y + dy, height);
      const occupant = occupancy[cellIndex(x, y, width)];
      if (occupant < 0 || !alive[occupant] || organisms[occupant]?.species !== 'grazer') continue;
      if (!best || distance < best.distance) best = { x, y, distance };
    }
  }
  return best;
}

function moveToward(
  organismIndex: number,
  animal: EcosystemOrganism,
  targetX: number,
  targetY: number,
  occupancy: Int16Array,
  width: number,
  height: number,
  random: () => number,
): void {
  const dx = wrappedDelta(animal.x, targetX, width);
  const dy = wrappedDelta(animal.y, targetY, height);
  const candidates: Array<[number, number]> = [];
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) candidates.push([Math.sign(dx), 0]);
  if (dy !== 0) candidates.push([0, Math.sign(dy)]);
  if (Math.abs(dx) < Math.abs(dy) && dx !== 0) candidates.push([Math.sign(dx), 0]);
  if (candidates.length === 2 && random() < 0.5) candidates.reverse();

  for (const [stepX, stepY] of candidates) {
    const x = wrap(animal.x + stepX, width);
    const y = wrap(animal.y + stepY, height);
    const nextIndex = cellIndex(x, y, width);
    if (occupancy[nextIndex] >= 0) continue;
    occupancy[cellIndex(animal.x, animal.y, width)] = -1;
    animal.x = x;
    animal.y = y;
    occupancy[nextIndex] = organismIndex;
    return;
  }
}

function moveToRandomNeighbour(
  organismIndex: number,
  animal: EcosystemOrganism,
  occupancy: Int16Array,
  width: number,
  height: number,
  random: () => number,
): void {
  const directions: Array<[number, number]> = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1],
  ];
  for (let index = directions.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [directions[index], directions[other]] = [directions[other], directions[index]];
  }
  for (const [dx, dy] of directions) {
    const x = wrap(animal.x + dx, width);
    const y = wrap(animal.y + dy, height);
    const nextIndex = cellIndex(x, y, width);
    if (occupancy[nextIndex] >= 0) continue;
    occupancy[cellIndex(animal.x, animal.y, width)] = -1;
    animal.x = x;
    animal.y = y;
    occupancy[nextIndex] = organismIndex;
    return;
  }
}

function findBirthPosition(
  animal: EcosystemOrganism,
  occupancy: Int16Array,
  width: number,
  height: number,
  random: () => number,
): { x: number; y: number } | null {
  const directions: Array<[number, number]> = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1],
  ];
  for (let index = directions.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [directions[index], directions[other]] = [directions[other], directions[index]];
  }
  for (const [dx, dy] of directions) {
    const x = wrap(animal.x + dx, width);
    const y = wrap(animal.y + dy, height);
    if (occupancy[cellIndex(x, y, width)] < 0) return { x, y };
  }
  return null;
}

export function stepEcosystem(world: EcosystemWorld): EcosystemWorld {
  const food = new Uint8Array(world.food);
  const organisms = world.organisms.map((animal) => ({
    ...animal,
    genome: { ...animal.genome },
  }));
  const alive = organisms.map(() => true);
  const occupancy = new Int16Array(world.width * world.height);
  occupancy.fill(-1);
  for (let index = 0; index < organisms.length; index++) {
    const animal = organisms[index];
    occupancy[cellIndex(animal.x, animal.y, world.width)] = index;
  }

  const randomState = createRandom(world.rngState);
  const random = randomState.next;
  const rules = world.rules;

  for (let index = 0; index < food.length; index++) {
    if (food[index] < 3 && random() < rules.foodRegrowth) food[index]++;
  }

  const order = Array.from({ length: organisms.length }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }

  let birthsThisGeneration = 0;
  let deathsThisGeneration = 0;

  for (const organismIndex of order) {
    const animal = organisms[organismIndex];
    if (!alive[organismIndex]) continue;

    animal.age++;
    const baseMetabolism = animal.species === 'grazer' ? 0.43 : 0.68;
    animal.energy -= baseMetabolism * animal.genome.metabolism * rules.metabolism;
    const lifespan = animal.species === 'grazer' ? 520 : 460;
    if (animal.energy <= 0 || animal.age > lifespan) {
      alive[organismIndex] = false;
      occupancy[cellIndex(animal.x, animal.y, world.width)] = -1;
      deathsThisGeneration++;
      continue;
    }

    if (animal.species === 'grazer') {
      const current = cellIndex(animal.x, animal.y, world.width);
      if (food[current] > 0) {
        food[current]--;
        animal.energy = Math.min(130, animal.energy + 16);
      }
      if (animal.energy < 112) {
        const target = findFoodTarget(animal, food, world.width, world.height);
        if (target && (target.x !== animal.x || target.y !== animal.y)) {
          moveToward(organismIndex, animal, target.x, target.y, occupancy, world.width, world.height, random);
        }
      }
    } else {
      const prey = findPreyTarget(animal, organisms, alive, occupancy, world.width, world.height);
      if (prey && prey.distance <= 1) {
        const preyIndex = occupancy[cellIndex(prey.x, prey.y, world.width)];
        if (preyIndex >= 0 && alive[preyIndex]) {
          alive[preyIndex] = false;
          occupancy[cellIndex(prey.x, prey.y, world.width)] = -1;
          animal.energy = Math.min(130, animal.energy + rules.predationEnergy);
          deathsThisGeneration++;
        }
      } else if (prey) {
        moveToward(organismIndex, animal, prey.x, prey.y, occupancy, world.width, world.height, random);
      } else if (random() < 0.08) {
        moveToRandomNeighbour(organismIndex, animal, occupancy, world.width, world.height, random);
      }
    }

    const threshold = animal.species === 'grazer'
      ? rules.reproductionThreshold
      : rules.reproductionThreshold + 14;
    const populationNow = organisms.length - deathsThisGeneration;
    if (
      animal.age >= 14 &&
      animal.energy >= threshold &&
      populationNow < MAX_POPULATION &&
      random() < animal.genome.fertility
    ) {
      const position = findBirthPosition(animal, occupancy, world.width, world.height, random);
      if (position) {
        const childIndex = organisms.length;
        const child: EcosystemOrganism = {
          id: world.nextId + birthsThisGeneration,
          species: animal.species,
          ...position,
          energy: 34,
          age: 0,
          genome: mutateGenome(animal.genome, rules.mutationRate, random),
        };
        animal.energy -= 31;
        organisms.push(child);
        alive.push(true);
        occupancy[cellIndex(position.x, position.y, world.width)] = childIndex;
        birthsThisGeneration++;
      }
    }
  }

  const survivors = organisms.filter((_, index) => alive[index]);
  return {
    ...world,
    generation: world.generation + 1,
    rngState: randomState.state,
    nextId: world.nextId + birthsThisGeneration,
    food,
    organisms: survivors,
    births: world.births + birthsThisGeneration,
    deaths: world.deaths + deathsThisGeneration,
  };
}

export function getEcosystemStats(world: EcosystemWorld): EcosystemStats {
  let grazers = 0;
  let hunters = 0;
  let totalEnergy = 0;
  let totalMetabolism = 0;
  let totalVision = 0;
  let totalFertility = 0;
  for (const animal of world.organisms) {
    if (animal.species === 'grazer') grazers++;
    else hunters++;
    totalEnergy += animal.energy;
    totalMetabolism += animal.genome.metabolism;
    totalVision += animal.genome.vision;
    totalFertility += animal.genome.fertility;
  }

  let foodCells = 0;
  let foodUnits = 0;
  for (const amount of world.food) {
    if (amount > 0) foodCells++;
    foodUnits += amount;
  }
  const population = world.organisms.length;
  return {
    population,
    grazers,
    hunters,
    foodCells,
    foodUnits,
    averageEnergy: population ? totalEnergy / population : 0,
    averageMetabolism: population ? totalMetabolism / population : 0,
    averageVision: population ? totalVision / population : 0,
    averageFertility: population ? totalFertility / population : 0,
    births: world.births,
    deaths: world.deaths,
    predatorPreyRatio: grazers ? hunters / grazers : hunters ? Infinity : 0,
  };
}

export function serializeEcosystem(world: EcosystemWorld): string {
  let food = '';
  for (let index = 0; index < world.food.length; index++) food += String(world.food[index]);
  return JSON.stringify({
    version: 1,
    width: world.width,
    height: world.height,
    generation: world.generation,
    seed: world.seed,
    rngState: world.rngState,
    nextId: world.nextId,
    food,
    organisms: world.organisms,
    births: world.births,
    deaths: world.deaths,
    rules: world.rules,
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validRules(value: unknown): value is EcosystemRules {
  if (!value || typeof value !== 'object') return false;
  const rules = value as Record<string, unknown>;
  return isFiniteNumber(rules.foodRegrowth) && rules.foodRegrowth >= 0.001 && rules.foodRegrowth <= 0.08
    && isFiniteNumber(rules.metabolism) && rules.metabolism >= 0.4 && rules.metabolism <= 2.5
    && isFiniteNumber(rules.mutationRate) && rules.mutationRate >= 0 && rules.mutationRate <= 0.25
    && isFiniteNumber(rules.reproductionThreshold) && rules.reproductionThreshold >= 35 && rules.reproductionThreshold <= 120
    && isFiniteNumber(rules.predationEnergy) && rules.predationEnergy >= 5 && rules.predationEnergy <= 70;
}

export function deserializeEcosystem(value: unknown): EcosystemWorld | null {
  if (typeof value !== 'string' || value.length > MAX_SNAPSHOT_LENGTH) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.version !== 1 || !isFiniteNumber(parsed.width) || !Number.isInteger(parsed.width)
      || !isFiniteNumber(parsed.height) || !Number.isInteger(parsed.height)) return null;
    const width = parsed.width;
    const height = parsed.height;
    if (width < MIN_WIDTH || width > MAX_WIDTH || height < MIN_HEIGHT || height > MAX_HEIGHT
      || width * height > MAX_CELLS) return null;
    if (typeof parsed.food !== 'string' || parsed.food.length !== width * height) return null;
    if (!isFiniteNumber(parsed.seed) || !Number.isInteger(parsed.seed) || parsed.seed < 1 || parsed.seed > 0xffff_ffff) return null;
    if (!isFiniteNumber(parsed.rngState) || !Number.isInteger(parsed.rngState) || parsed.rngState < 0 || parsed.rngState > 0xffff_ffff) return null;
    if (!isFiniteNumber(parsed.generation) || !Number.isInteger(parsed.generation) || parsed.generation < 0) return null;
    if (!isFiniteNumber(parsed.nextId) || !Number.isInteger(parsed.nextId) || parsed.nextId < 1 || parsed.nextId > 2_000_000_000) return null;
    if (!isFiniteNumber(parsed.births) || !Number.isInteger(parsed.births) || parsed.births < 0) return null;
    if (!isFiniteNumber(parsed.deaths) || !Number.isInteger(parsed.deaths) || parsed.deaths < 0) return null;
    if (!validRules(parsed.rules)) return null;
    const food = new Uint8Array(width * height);
    for (let index = 0; index < parsed.food.length; index++) {
      const amount = parsed.food.charCodeAt(index) - 48;
      if (amount < 0 || amount > 3) return null;
      food[index] = amount;
    }
    if (!Array.isArray(parsed.organisms) || parsed.organisms.length > MAX_POPULATION) return null;
    const occupied = new Set<number>();
    const ids = new Set<number>();
    const organisms: EcosystemOrganism[] = [];
    for (const item of parsed.organisms) {
      if (!item || typeof item !== 'object') return null;
      const animal = item as Record<string, unknown>;
      if (!isFiniteNumber(animal.id) || !Number.isInteger(animal.id) || animal.id < 1 || ids.has(animal.id)) return null;
      if (animal.species !== 'grazer' && animal.species !== 'hunter') return null;
      if (!isFiniteNumber(animal.x) || !Number.isInteger(animal.x) || animal.x < 0 || animal.x >= width) return null;
      if (!isFiniteNumber(animal.y) || !Number.isInteger(animal.y) || animal.y < 0 || animal.y >= height) return null;
      if (!isFiniteNumber(animal.energy) || animal.energy < 0 || animal.energy > 130) return null;
      if (!isFiniteNumber(animal.age) || !Number.isInteger(animal.age) || animal.age < 0 || animal.age > 1_000_000) return null;
      if (!animal.genome || typeof animal.genome !== 'object') return null;
      const genome = animal.genome as Record<string, unknown>;
      if (!isFiniteNumber(genome.metabolism) || genome.metabolism < 0.45 || genome.metabolism > 1.6) return null;
      if (!isFiniteNumber(genome.vision) || !Number.isInteger(genome.vision) || genome.vision < 2 || genome.vision > 10) return null;
      if (!isFiniteNumber(genome.fertility) || genome.fertility < 0.008 || genome.fertility > 0.065) return null;
      const position = cellIndex(animal.x, animal.y, width);
      if (occupied.has(position)) return null;
      occupied.add(position);
      ids.add(animal.id);
      organisms.push({
        id: animal.id,
        species: animal.species,
        x: animal.x,
        y: animal.y,
        energy: animal.energy,
        age: animal.age,
        genome: { metabolism: genome.metabolism, vision: genome.vision, fertility: genome.fertility },
      });
    }
    if (ids.size > 0 && parsed.nextId <= Math.max(...ids)) return null;
    return {
      width,
      height,
      generation: Math.min(10_000_000, parsed.generation),
      seed: parsed.seed,
      rngState: parsed.rngState,
      nextId: parsed.nextId,
      food,
      organisms,
      births: Math.min(2_000_000_000, parsed.births),
      deaths: Math.min(2_000_000_000, parsed.deaths),
      rules: { ...parsed.rules },
    };
  } catch {
    return null;
  }
}
