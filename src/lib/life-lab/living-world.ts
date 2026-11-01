export type SpeciesId = 'grazer' | 'hunter' | 'omnivore' | 'parasite' | 'microbe';
export type BiomeId = 'plains' | 'forest' | 'desert' | 'mountain' | 'water' | 'wetland';
export type WeatherId = 'clear' | 'rain' | 'drought' | 'storm' | 'heatwave' | 'wildfire';
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WorldGenome {
  metabolism: number;
  vision: number;
  fertility: number;
  speed: number;
  sociality: number;
  aggression: number;
  camouflage: number;
  immunity: number;
  efficiency: number;
  virulence: number;
}

export interface WorldOrganism {
  id: number;
  species: SpeciesId;
  x: number;
  y: number;
  energy: number;
  age: number;
  genome: WorldGenome;
  memoryX: number;
  memoryY: number;
  threatX: number;
  threatY: number;
  territoryX: number;
  territoryY: number;
  hostId: number;
  lineageId: number;
}

export interface WorldRules {
  foodRegrowth: number;
  metabolism: number;
  mutationRate: number;
  reproductionThreshold: number;
  predationPressure: number;
  diseasePressure: number;
  climateIntensity: number;
}

export interface WorldEvent {
  id: number;
  generation: number;
  type: 'season' | 'weather' | 'birth' | 'predation' | 'extinction' | 'boom' | 'crash' | 'speciation' | 'milestone';
  title: string;
  detail: string;
}

export interface LivingWorld {
  width: number;
  height: number;
  generation: number;
  seed: number;
  rngState: number;
  nextId: number;
  nextLineageId: number;
  food: Uint8Array;
  detritus: Uint8Array;
  fertility: Uint8Array;
  humidity: Uint8Array;
  temperature: Uint8Array;
  elevation: Uint8Array;
  biomes: Uint8Array;
  organisms: WorldOrganism[];
  births: number;
  deaths: number;
  season: SeasonId;
  weather: WeatherId;
  weatherRemaining: number;
  rules: WorldRules;
  eventLog: WorldEvent[];
}

export interface LivingWorldStats {
  population: number;
  counts: Record<SpeciesId, number>;
  foodUnits: number;
  detritusUnits: number;
  averageEnergy: number;
  averageTraits: WorldGenome;
  births: number;
  deaths: number;
  diversity: number;
  lineageDiversity: number;
  preyPredatorBalance: number;
  fertileTiles: number;
}

export const SPECIES: Array<{ id: SpeciesId; name: string; short: string; role: string; color: string }> = [
  { id: 'grazer', name: 'Động vật ăn cỏ', short: 'Ăn cỏ', role: 'Ăn thực vật, tụ đàn và chạy khỏi thú săn', color: '#a9efba' },
  { id: 'hunter', name: 'Động vật săn mồi', short: 'Săn mồi', role: 'Săn con mồi và tuần tra lãnh thổ', color: '#ff987c' },
  { id: 'omnivore', name: 'Động vật ăn tạp', short: 'Ăn tạp', role: 'Kết hợp thức ăn thực vật và săn mồi cơ hội', color: '#e9bdff' },
  { id: 'parasite', name: 'Sinh vật ký sinh', short: 'Ký sinh', role: 'Bám vật chủ, hút năng lượng và chịu áp lực miễn dịch', color: '#f3d16f' },
  { id: 'microbe', name: 'Vi sinh vật', short: 'Vi sinh', role: 'Phân giải vật chất hữu cơ và cải thiện độ phì đất', color: '#80d8ee' },
];

export const BIOMES: Array<{ id: BiomeId; name: string; color: string; description: string }> = [
  { id: 'plains', name: 'Đồng cỏ', color: '#536c43', description: 'Nguồn thức ăn ổn định và tầm nhìn rộng' },
  { id: 'forest', name: 'Rừng', color: '#214f3d', description: 'Nhiều thức ăn, che phủ tốt và di chuyển chậm hơn' },
  { id: 'desert', name: 'Sa mạc', color: '#9b8052', description: 'Khô hạn, nguồn thức ăn thấp và nhiệt độ cao' },
  { id: 'mountain', name: 'Núi', color: '#69747b', description: 'Địa hình khó đi và ít thảm thực vật' },
  { id: 'water', name: 'Nước', color: '#245c78', description: 'Sông, hồ và vùng nước không thể đi qua' },
  { id: 'wetland', name: 'Đầm lầy', color: '#396d61', description: 'Ẩm ướt, giàu dinh dưỡng và thảm thực vật' },
];

export const WEATHER: Array<{ id: WeatherId; name: string }> = [
  { id: 'clear', name: 'Trời quang' },
  { id: 'rain', name: 'Mưa' },
  { id: 'drought', name: 'Hạn hán' },
  { id: 'storm', name: 'Bão' },
  { id: 'heatwave', name: 'Nắng nóng' },
  { id: 'wildfire', name: 'Cháy rừng' },
];

export const SEASONS: Array<{ id: SeasonId; name: string }> = [
  { id: 'spring', name: 'Mùa xuân' },
  { id: 'summer', name: 'Mùa hạ' },
  { id: 'autumn', name: 'Mùa thu' },
  { id: 'winter', name: 'Mùa đông' },
];

export const DEFAULT_WORLD_RULES: WorldRules = {
  foodRegrowth: 0.034,
  metabolism: 1,
  mutationRate: 0.075,
  reproductionThreshold: 88,
  predationPressure: 1,
  diseasePressure: 1,
  climateIntensity: 1,
};

const BIOME: Record<BiomeId, number> = {
  plains: 0,
  forest: 1,
  desert: 2,
  mountain: 3,
  water: 4,
  wetland: 5,
};
const BIOME_IDS: BiomeId[] = ['plains', 'forest', 'desert', 'mountain', 'water', 'wetland'];
const SEASON_IDS: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
const WEATHER_IDS: WeatherId[] = ['clear', 'rain', 'drought', 'storm', 'heatwave', 'wildfire'];
const SPECIES_IDS: SpeciesId[] = ['grazer', 'hunter', 'omnivore', 'parasite', 'microbe'];
const MAX_WIDTH = 90;
const MAX_HEIGHT = 60;
const MIN_WIDTH = 32;
const MIN_HEIGHT = 20;
const MAX_CELLS = 5_400;
const MAX_POPULATION = 420;
const MAX_EVENTS = 64;
const MAX_SNAPSHOT_LENGTH = 500_000;
const SEASON_LENGTH = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeDimension(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(clamp(value, min, max)) : fallback;
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

function hashNoise(seed: number, x: number, y: number, layer: number): number {
  let value = (seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca77) ^ Math.imul(layer + 1, 0xc2b2ae3d)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}

function indexOf(x: number, y: number, width: number): number {
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

function seasonAt(generation: number): SeasonId {
  return SEASON_IDS[Math.floor(generation / SEASON_LENGTH) % SEASON_IDS.length];
}

function countsOf(organisms: WorldOrganism[]): Record<SpeciesId, number> {
  const counts: Record<SpeciesId, number> = {
    grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0,
  };
  for (const animal of organisms) counts[animal.species]++;
  return counts;
}

function genomeFor(species: SpeciesId, random: () => number): WorldGenome {
  const common = {
    metabolism: 0.72 + random() * 0.48,
    vision: 3 + Math.floor(random() * 5),
    fertility: 0.02 + random() * 0.025,
    speed: 0.7 + random() * 0.65,
    sociality: random(),
    aggression: random(),
    camouflage: random(),
    immunity: 0.12 + random() * 0.5,
    efficiency: 0.72 + random() * 0.5,
    virulence: random() * 0.35,
  };
  if (species === 'hunter') return { ...common, metabolism: 0.9 + random() * 0.4, vision: 5 + Math.floor(random() * 5), aggression: 0.5 + random() * 0.5, sociality: random() * 0.55, speed: 0.9 + random() * 0.65 };
  if (species === 'omnivore') return { ...common, vision: 4 + Math.floor(random() * 5), efficiency: 0.85 + random() * 0.65 };
  if (species === 'parasite') return { ...common, metabolism: 0.5 + random() * 0.25, fertility: 0.035 + random() * 0.025, vision: 3 + Math.floor(random() * 3), virulence: 0.35 + random() * 0.55, camouflage: 0.35 + random() * 0.55, immunity: random() * 0.2 };
  if (species === 'microbe') return { ...common, metabolism: 0.48 + random() * 0.32, fertility: 0.035 + random() * 0.03, vision: 2 + Math.floor(random() * 2), speed: 0.45 + random() * 0.2, sociality: 0, efficiency: 1 + random() * 0.5 };
  return { ...common, speed: 0.8 + random() * 0.55, sociality: 0.35 + random() * 0.65, camouflage: 0.1 + random() * 0.5 };
}

function mutateGenome(genome: WorldGenome, rate: number, random: () => number): WorldGenome {
  const mutate = (value: number, min: number, max: number, scale = 1) => {
    if (random() > rate) return value;
    return clamp(value + (random() * 2 - 1) * rate * scale * (max - min), min, max);
  };
  return {
    metabolism: mutate(genome.metabolism, 0.45, 1.6),
    vision: Math.round(mutate(genome.vision, 2, 12, 0.65)),
    fertility: mutate(genome.fertility, 0.008, 0.08, 0.35),
    speed: mutate(genome.speed, 0.45, 1.9, 0.45),
    sociality: mutate(genome.sociality, 0, 1, 0.55),
    aggression: mutate(genome.aggression, 0, 1, 0.55),
    camouflage: mutate(genome.camouflage, 0, 1, 0.55),
    immunity: mutate(genome.immunity, 0, 1, 0.55),
    efficiency: mutate(genome.efficiency, 0.45, 1.8, 0.5),
    virulence: mutate(genome.virulence, 0, 1, 0.55),
  };
}

function splitLineage(
  parent: WorldOrganism,
  child: WorldOrganism,
  mutationRate: number,
): boolean {
  if (mutationRate < 0.08) return false;
  const ranges: Record<keyof WorldGenome, number> = {
    metabolism: 1.15, vision: 10, fertility: 0.072, speed: 1.45,
    sociality: 1, aggression: 1, camouflage: 1, immunity: 1,
    efficiency: 1.35, virulence: 1,
  };
  let largestShift = 0;
  let squaredDistance = 0;
  let changedTraits = 0;
  const keys = Object.keys(ranges) as Array<keyof WorldGenome>;
  for (const key of keys) {
    const shift = Math.abs(child.genome[key] - parent.genome[key]) / ranges[key];
    largestShift = Math.max(largestShift, shift);
    squaredDistance += shift * shift;
    if (shift >= 0.025) changedTraits++;
  }
  const meanGeneticDistance = Math.sqrt(squaredDistance / keys.length);
  // A lineage is split only when a child carries several meaningful changes
  // and a sufficiently large overall genome displacement. Random mutation
  // already supplies the stochastic component, so no second random gate is needed.
  return changedTraits >= 2 && largestShift >= 0.07 && meanGeneticDistance >= 0.035;
}

function passable(biome: number, species: SpeciesId): boolean {
  if (species === 'microbe') return biome !== BIOME.water;
  if (species === 'parasite') return biome !== BIOME.water && biome !== BIOME.mountain;
  return biome !== BIOME.water && biome !== BIOME.mountain;
}

function initialBiome(seed: number, x: number, y: number): { biome: number; elevation: number; moisture: number } {
  const center = hashNoise(seed, x, y, 1) * 0.5;
  const north = hashNoise(seed, x, y - 1, 1) * 0.125;
  const south = hashNoise(seed, x, y + 1, 1) * 0.125;
  const east = hashNoise(seed, x + 1, y, 1) * 0.125;
  const west = hashNoise(seed, x - 1, y, 1) * 0.125;
  const elevation = center + north + south + east + west;
  const moisture = hashNoise(seed, x, y, 2) * 0.72
    + hashNoise(seed, x - 2, y + 3, 2) * 0.16
    + hashNoise(seed, x + 3, y - 2, 2) * 0.12;
  let biome = BIOME.plains;
  if (elevation < 0.13) biome = BIOME.water;
  else if (elevation > 0.84) biome = BIOME.mountain;
  else if (moisture < 0.19) biome = BIOME.desert;
  else if (moisture > 0.76 && elevation < 0.62) biome = BIOME.wetland;
  else if (moisture > 0.55) biome = BIOME.forest;
  return { biome, elevation: Math.round(elevation * 255), moisture: Math.round(moisture * 255) };
}

function findPosition(
  worldWidth: number,
  worldHeight: number,
  biomes: Uint8Array,
  occupied: Uint8Array,
  species: SpeciesId,
  random: () => number,
): { x: number; y: number } | null {
  const total = worldWidth * worldHeight;
  for (let attempt = 0; attempt < Math.min(total, 240); attempt++) {
    const index = Math.floor(random() * total);
    if (occupied[index] === 0 && passable(biomes[index], species)) {
      occupied[index] = 1;
      return { x: index % worldWidth, y: Math.floor(index / worldWidth) };
    }
  }
  for (let index = 0; index < total; index++) {
    if (occupied[index] === 0 && passable(biomes[index], species)) {
      occupied[index] = 1;
      return { x: index % worldWidth, y: Math.floor(index / worldWidth) };
    }
  }
  return null;
}

function createOrganism(
  id: number,
  species: SpeciesId,
  x: number,
  y: number,
  random: () => number,
  hostId = -1,
  lineageId = SPECIES_IDS.indexOf(species) + 1,
): WorldOrganism {
  return {
    id,
    species,
    x,
    y,
    energy: species === 'microbe' ? 48 + random() * 18 : species === 'parasite' ? 28 + random() * 12 : 66 + random() * 28,
    age: Math.floor(random() * 10),
    genome: genomeFor(species, random),
    memoryX: -1,
    memoryY: -1,
    threatX: -1,
    threatY: -1,
    territoryX: x,
    territoryY: y,
    hostId,
    lineageId,
  };
}

export function createLivingWorld(
  seed = 20_261_101,
  width = 72,
  height = 44,
  populations: Partial<Record<SpeciesId, number>> = {},
): LivingWorld {
  const safeWidth = safeDimension(width, MIN_WIDTH, MAX_WIDTH, 72);
  const safeHeight = safeDimension(height, MIN_HEIGHT, MAX_HEIGHT, 44);
  const scale = Math.min(1, Math.sqrt(MAX_CELLS / (safeWidth * safeHeight)));
  const finalWidth = Math.max(MIN_WIDTH, Math.floor(safeWidth * scale));
  const finalHeight = Math.max(MIN_HEIGHT, Math.min(safeHeight, Math.floor(MAX_CELLS / finalWidth)));
  const total = finalWidth * finalHeight;
  const normalizedSeed = (Math.floor(Number.isFinite(seed) ? seed : 1) >>> 0) || 1;
  const random = createRandom(normalizedSeed);
  const food = new Uint8Array(total);
  const detritus = new Uint8Array(total);
  const fertility = new Uint8Array(total);
  const humidity = new Uint8Array(total);
  const temperature = new Uint8Array(total);
  const elevation = new Uint8Array(total);
  const biomes = new Uint8Array(total);

  for (let y = 0; y < finalHeight; y++) {
    for (let x = 0; x < finalWidth; x++) {
      const index = indexOf(x, y, finalWidth);
      const terrain = initialBiome(normalizedSeed, x, y);
      biomes[index] = terrain.biome;
      elevation[index] = terrain.elevation;
      humidity[index] = terrain.moisture;
      temperature[index] = Math.round(clamp(178 - terrain.elevation * 0.18 + (random.next() - 0.5) * 30, 0, 255));
      const fertileBase = terrain.biome === BIOME.forest ? 205
        : terrain.biome === BIOME.wetland ? 225
          : terrain.biome === BIOME.plains ? 145
            : terrain.biome === BIOME.desert ? 45
              : terrain.biome === BIOME.mountain ? 65 : 0;
      fertility[index] = Math.round(clamp(fertileBase + (random.next() - 0.5) * 40, 0, 255));
      const foodBase = terrain.biome === BIOME.forest ? 10
        : terrain.biome === BIOME.wetland ? 11
          : terrain.biome === BIOME.plains ? 7
            : terrain.biome === BIOME.desert ? 2
              : terrain.biome === BIOME.mountain ? 1 : 0;
      food[index] = Math.round(clamp(foodBase + (random.next() - 0.5) * 7, 0, 15));
    }
  }

  const occupied = new Uint8Array(total);
  const organisms: WorldOrganism[] = [];
  let nextId = 1;
  const requested: Record<SpeciesId, number> = {
    grazer: Math.floor(clamp(populations.grazer ?? 42, 0, 180)),
    hunter: Math.floor(clamp(populations.hunter ?? 8, 0, 80)),
    omnivore: Math.floor(clamp(populations.omnivore ?? 12, 0, 100)),
    parasite: Math.floor(clamp(populations.parasite ?? 7, 0, 80)),
    microbe: Math.floor(clamp(populations.microbe ?? 28, 0, 160)),
  };
  const totalRequested = Math.min(MAX_POPULATION, Object.values(requested).reduce((sum, value) => sum + value, 0));
  for (const species of SPECIES_IDS) {
    for (let count = 0; count < requested[species] && organisms.length < totalRequested; count++) {
      if (species === 'parasite') {
        const hosts = organisms.filter((animal) => animal.species === 'grazer' || animal.species === 'omnivore');
        if (hosts.length > 0) {
          const host = hosts[Math.floor(random.next() * hosts.length)];
          organisms.push(createOrganism(nextId++, species, host.x, host.y, random.next, host.id));
          continue;
        }
      }
      const position = findPosition(finalWidth, finalHeight, biomes, occupied, species, random.next);
      if (!position) continue;
      organisms.push(createOrganism(nextId++, species, position.x, position.y, random.next));
    }
  }

  // Carve a continuous meandering river through the generated terrain.
  const riverPhase = hashNoise(normalizedSeed, 7, 19, 4) * Math.PI * 2;
  for (let x = 0; x < finalWidth; x++) {
    const centerY = Math.floor(finalHeight * (0.48 + 0.17 * Math.sin(x * 0.075 + riverPhase) + 0.055 * Math.sin(x * 0.19 + riverPhase * 0.7)));
    for (let offset = -1; offset <= 1; offset++) {
      const y = centerY + offset;
      if (y < 0 || y >= finalHeight) continue;
      const index = indexOf(x, y, finalWidth);
      biomes[index] = BIOME.water;
      humidity[index] = 255;
      fertility[index] = 0;
      food[index] = 0;
    }
  }

  const world: LivingWorld = {
    width: finalWidth,
    height: finalHeight,
    generation: 0,
    seed: normalizedSeed,
    rngState: random.state,
    nextId,
    nextLineageId: SPECIES_IDS.length + 1,
    food,
    detritus,
    fertility,
    humidity,
    temperature,
    elevation,
    biomes,
    organisms,
    births: 0,
    deaths: 0,
    season: 'spring',
    weather: 'clear',
    weatherRemaining: 12,
    rules: { ...DEFAULT_WORLD_RULES },
    eventLog: [{
      id: 1,
      generation: 0,
      type: 'milestone',
      title: 'Thế giới được khởi tạo',
      detail: 'Một hành tinh nhỏ với ' + Object.values(BIOME).length + ' dạng địa hình và ' + organisms.length + ' cá thể ban đầu.',
    }],
  };
  return world;
}

function nearestFood(
  animal: WorldOrganism,
  world: LivingWorld,
  radius: number,
): { x: number; y: number; score: number } | null {
  let best: { x: number; y: number; score: number } | null = null;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > radius) continue;
      const x = wrap(animal.x + dx, world.width);
      const y = wrap(animal.y + dy, world.height);
      const index = indexOf(x, y, world.width);
      if (world.food[index] === 0) continue;
      const score = world.food[index] * 2 + world.fertility[index] * 0.02 - distance;
      if (!best || score > best.score) best = { x, y, score };
    }
  }
  return best;
}

function nearestHost(
  animal: WorldOrganism,
  organisms: WorldOrganism[],
  alive: boolean[],
  occupancy: Int16Array,
  world: LivingWorld,
  radius: number,
): { x: number; y: number; distance: number; hostIndex: number } | null {
  let best: { x: number; y: number; distance: number; score: number; hostIndex: number } | null = null;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > radius) continue;
      const x = wrap(animal.x + dx, world.width);
      const y = wrap(animal.y + dy, world.height);
      const occupant = occupancy[indexOf(x, y, world.width)];
      if (occupant < 0 || !alive[occupant]) continue;
      const host = organisms[occupant];
      if (!host || (host.species !== 'grazer' && host.species !== 'omnivore')) continue;
      const score = distance - host.genome.immunity * 2 + animal.genome.virulence;
      if (!best || score < best.score) best = { x, y, distance, score, hostIndex: occupant };
    }
  }
  return best;
}

function nearestPrey(
  animal: WorldOrganism,
  organisms: WorldOrganism[],
  alive: boolean[],
  occupancy: Int16Array,
  world: LivingWorld,
  radius: number,
): { x: number; y: number; distance: number; preyIndex: number } | null {
  let best: { x: number; y: number; distance: number; preyIndex: number } | null = null;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > radius) continue;
      const x = wrap(animal.x + dx, world.width);
      const y = wrap(animal.y + dy, world.height);
      const occupant = occupancy[indexOf(x, y, world.width)];
      if (occupant < 0 || !alive[occupant]) continue;
      const prey = organisms[occupant];
      if (!prey || prey.species === 'hunter' || prey.species === 'parasite' || prey.species === 'microbe') continue;
      const camouflage = prey.genome.camouflage * 1.5;
      const score = distance + camouflage - animal.genome.vision * 0.01;
      if (!best || score < best.distance) best = { x, y, distance, preyIndex: occupant };
    }
  }
  return best;
}

function nearestThreat(
  animal: WorldOrganism,
  organisms: WorldOrganism[],
  alive: boolean[],
  occupancy: Int16Array,
  world: LivingWorld,
): { x: number; y: number; distance: number } | null {
  let best: { x: number; y: number; distance: number } | null = null;
  const radius = Math.min(4, animal.genome.vision);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > radius) continue;
      const x = wrap(animal.x + dx, world.width);
      const y = wrap(animal.y + dy, world.height);
      const occupant = occupancy[indexOf(x, y, world.width)];
      if (occupant < 0 || !alive[occupant]) continue;
      const threat = organisms[occupant];
      if (!threat || (threat.species !== 'hunter' && threat.species !== 'omnivore')) continue;
      if (!best || distance < best.distance) best = { x, y, distance };
    }
  }
  return best;
}

function nearestTerritoryRival(
  animal: WorldOrganism,
  organisms: WorldOrganism[],
  alive: boolean[],
  occupancy: Int16Array,
  world: LivingWorld,
): { x: number; y: number; distance: number; rivalIndex: number } | null {
  let best: { x: number; y: number; distance: number; rivalIndex: number } | null = null;
  const radius = Math.min(4, animal.genome.vision);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (distance === 0 || distance > radius) continue;
      const x = wrap(animal.x + dx, world.width);
      const y = wrap(animal.y + dy, world.height);
      const rivalIndex = occupancy[indexOf(x, y, world.width)];
      if (rivalIndex < 0 || !alive[rivalIndex]) continue;
      const rival = organisms[rivalIndex];
      if (!rival || rival.species !== 'hunter' || rival.id === animal.id) continue;
      const territoryDistance = Math.max(
        Math.abs(wrappedDelta(animal.territoryX, rival.territoryX, world.width)),
        Math.abs(wrappedDelta(animal.territoryY, rival.territoryY, world.height)),
      );
      if (territoryDistance > 7) continue;
      if (!best || distance < best.distance) best = { x, y, distance, rivalIndex };
    }
  }
  return best;
}

function moveOneStep(
  organismIndex: number,
  animal: WorldOrganism,
  targetX: number,
  targetY: number,
  occupancy: Int16Array,
  world: LivingWorld,
  random: () => number,
  flee = false,
): void {
  let dx = wrappedDelta(animal.x, targetX, world.width);
  let dy = wrappedDelta(animal.y, targetY, world.height);
  if (flee) { dx *= -1; dy *= -1; }
  const candidates: Array<[number, number]> = [];
  const xFirst = Math.abs(dx) >= Math.abs(dy);
  if (xFirst && dx !== 0) candidates.push([Math.sign(dx), 0]);
  if (dy !== 0) candidates.push([0, Math.sign(dy)]);
  if (!xFirst && dx !== 0) candidates.push([Math.sign(dx), 0]);
  if (random() < 0.5) candidates.reverse();
  candidates.push([0, -1], [1, 0], [0, 1], [-1, 0]);
  const tried = new Set<string>();
  for (const [stepX, stepY] of candidates) {
    const key = stepX + ':' + stepY;
    if (tried.has(key)) continue;
    tried.add(key);
    const x = wrap(animal.x + stepX, world.width);
    const y = wrap(animal.y + stepY, world.height);
    const index = indexOf(x, y, world.width);
    if (occupancy[index] >= 0 || !passable(world.biomes[index], animal.species)) continue;
    occupancy[indexOf(animal.x, animal.y, world.width)] = -1;
    animal.x = x;
    animal.y = y;
    occupancy[index] = organismIndex;
    return;
  }
}

function moveToward(
  organismIndex: number,
  animal: WorldOrganism,
  targetX: number,
  targetY: number,
  occupancy: Int16Array,
  world: LivingWorld,
  random: () => number,
): void {
  const steps = animal.genome.speed > 1.45 ? 2 : 1;
  for (let step = 0; step < steps; step++) {
    const beforeX = animal.x;
    const beforeY = animal.y;
    moveOneStep(organismIndex, animal, targetX, targetY, occupancy, world, random);
    if (animal.x === beforeX && animal.y === beforeY) break;
    if (animal.x === targetX && animal.y === targetY) break;
  }
}

function findNeighborPosition(
  animal: WorldOrganism,
  occupancy: Int16Array,
  world: LivingWorld,
  random: () => number,
): { x: number; y: number } | null {
  const directions: Array<[number, number]> = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1],
  ];
  for (let i = directions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [directions[i], directions[j]] = [directions[j], directions[i]];
  }
  for (const [dx, dy] of directions) {
    const x = wrap(animal.x + dx, world.width);
    const y = wrap(animal.y + dy, world.height);
    const index = indexOf(x, y, world.width);
    if (occupancy[index] < 0 && passable(world.biomes[index], animal.species)) return { x, y };
  }
  return null;
}

function addEvent(events: WorldEvent[], generation: number, type: WorldEvent['type'], title: string, detail: string): void {
  events.push({ id: generation * 100 + events.length + 1, generation, type, title, detail });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

function updateClimate(world: LivingWorld, random: () => number): { season: SeasonId; weather: WeatherId; remaining: number; events: WorldEvent[] } {
  const generation = world.generation + 1;
  const season = seasonAt(generation);
  const weather = world.weatherRemaining <= 1
    ? (['clear', 'rain', 'drought', 'storm', 'heatwave', 'wildfire'] as WeatherId[])[Math.floor(random() * WEATHER_IDS.length)]
    : world.weather;
  const remaining = weather === world.weather && world.weatherRemaining > 1
    ? world.weatherRemaining - 1
    : 8 + Math.floor(random() * 13);
  const events: WorldEvent[] = [];
  if (season !== world.season) addEvent(events, generation, 'season', 'Mùa mới bắt đầu', 'Thời tiết, tăng trưởng thực vật và hoạt động sinh vật chuyển sang ' + SEASONS.find((entry) => entry.id === season)?.name + '.');
  if (weather !== world.weather) addEvent(events, generation, 'weather', 'Thời tiết thay đổi', 'Điều kiện khí hậu hiện tại: ' + WEATHER.find((entry) => entry.id === weather)?.name + '.');
  return { season, weather, remaining, events };
}

function growEnvironment(world: LivingWorld, food: Uint8Array, detritus: Uint8Array, humidity: Uint8Array, temperature: Uint8Array, fertility: Uint8Array, random: () => number, season: SeasonId, weather: WeatherId): void {
  const seasonalGrowth = season === 'spring' ? 1.35 : season === 'summer' ? 0.95 : season === 'autumn' ? 0.82 : 0.42;
  for (let index = 0; index < food.length; index++) {
    const biome = world.biomes[index];
    const base = biome === BIOME.forest ? 1.5 : biome === BIOME.wetland ? 1.65 : biome === BIOME.plains ? 1 : biome === BIOME.desert ? 0.24 : biome === BIOME.mountain ? 0.35 : 0;
    const climate = (humidity[index] / 255) * (temperature[index] > 28 && temperature[index] < 235 ? 1 : 0.45);
    const weatherFactor = weather === 'rain' ? 2.2 : weather === 'drought' ? 0.14 : weather === 'heatwave' ? 0.22 : weather === 'storm' ? 0.75 : weather === 'wildfire' ? 0.28 : 1;
    const probability = world.rules.foodRegrowth * seasonalGrowth * base * (0.25 + climate) * (0.35 + fertility[index] / 170) * weatherFactor;
    if (food[index] < 15 && random() < probability) food[index]++;
    if (biome === BIOME.forest && weather === 'wildfire' && random() < 0.085) {
      food[index] = Math.max(0, food[index] - 7);
      detritus[index] = Math.min(15, detritus[index] + 2);
      fertility[index] = Math.max(0, fertility[index] - 4);
    }
    const moistureTarget = weather === 'rain' ? 240 : weather === 'drought' || weather === 'heatwave' ? 18 : biome === BIOME.water || biome === BIOME.wetland ? 224 : 112;
    humidity[index] = Math.round(clamp(humidity[index] + (moistureTarget - humidity[index]) * (world.rules.climateIntensity * 0.018), 0, 255));
    const seasonOffset = season === 'summer' ? 24 : season === 'winter' ? -34 : season === 'autumn' ? -8 : 8;
    const weatherOffset = weather === 'heatwave' ? 34 : weather === 'storm' ? -14 : weather === 'rain' ? -5 : 0;
    temperature[index] = Math.round(clamp(temperature[index] + (128 + seasonOffset + weatherOffset - temperature[index]) * 0.035 * world.rules.climateIntensity, 0, 255));
    if (detritus[index] > 0 && random() < 0.03) detritus[index]--;
  }
}

function socialTarget(animal: WorldOrganism, organisms: WorldOrganism[], alive: boolean[], world: LivingWorld): { x: number; y: number } | null {
  if (animal.genome.sociality < 0.25) return null;
  let totalX = 0;
  let totalY = 0;
  let found = 0;
  for (let i = 0; i < organisms.length; i++) {
    const other = organisms[i];
    if (i === -1 || !alive[i] || other.id === animal.id || other.species !== animal.species) continue;
    const dx = wrappedDelta(animal.x, other.x, world.width);
    const dy = wrappedDelta(animal.y, other.y, world.height);
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 4) {
      totalX += dx;
      totalY += dy;
      found++;
    }
  }
  if (found === 0) return null;
  return {
    x: wrap(animal.x + Math.round(totalX / found), world.width),
    y: wrap(animal.y + Math.round(totalY / found), world.height),
  };
}

function habitatPenalty(animal: WorldOrganism, world: LivingWorld): number {
  const biome = world.biomes[indexOf(animal.x, animal.y, world.width)];
  if (animal.species === 'grazer' || animal.species === 'omnivore') {
    if (biome === BIOME.desert) return 1.45;
    if (biome === BIOME.forest) return 0.92;
    if (biome === BIOME.wetland) return 1.08;
  }
  if (animal.species === 'hunter' && biome === BIOME.forest) return 0.93;
  return 1;
}

function preferredTarget(animal: WorldOrganism, world: LivingWorld): { x: number; y: number } | null {
  if (animal.memoryX < 0 || animal.memoryY < 0) return null;
  const index = indexOf(animal.memoryX, animal.memoryY, world.width);
  if (world.food[index] === 0) return null;
  return { x: animal.memoryX, y: animal.memoryY };
}

export function stepLivingWorld(world: LivingWorld): LivingWorld {
  const food = new Uint8Array(world.food);
  const detritus = new Uint8Array(world.detritus);
  const humidity = new Uint8Array(world.humidity);
  const temperature = new Uint8Array(world.temperature);
  const fertility = new Uint8Array(world.fertility);
  const organisms = world.organisms.map((animal) => ({ ...animal, genome: { ...animal.genome } }));
  const alive = organisms.map(() => true);
  const occupancy = new Int16Array(world.width * world.height);
  occupancy.fill(-1);
  const idToIndex = new Map<number, number>();
  for (let index = 0; index < organisms.length; index++) {
    idToIndex.set(organisms[index].id, index);
    if (organisms[index].species !== 'parasite' || organisms[index].hostId < 0) {
      occupancy[indexOf(organisms[index].x, organisms[index].y, world.width)] = index;
    }
  }

  const randomState = createRandom(world.rngState);
  const random = randomState.next;
  const climate = updateClimate(world, random);
  growEnvironment(world, food, detritus, humidity, temperature, fertility, random, climate.season, climate.weather);

  const order = Array.from({ length: organisms.length }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  let birthsNow = 0;
  let deathsNow = 0;
  let predationsNow = 0;
  let nextLineageId = world.nextLineageId;
  const newLineages = new Set<number>();
  for (const organismIndex of order) {
    const animal = organisms[organismIndex];
    if (!alive[organismIndex]) continue;

    if (animal.species === 'parasite' && animal.hostId >= 0) {
      const hostIndex = idToIndex.get(animal.hostId);
      if (hostIndex === undefined || !alive[hostIndex]) {
        animal.hostId = -1;
        const dropped = indexOf(animal.x, animal.y, world.width);
        if (occupancy[dropped] < 0) occupancy[dropped] = organismIndex;
      } else {
        const host = organisms[hostIndex];
        animal.x = host.x;
        animal.y = host.y;
        const drain = (0.25 + animal.genome.virulence * 1.2) * world.rules.diseasePressure * (1 - host.genome.immunity * 0.72);
        host.energy -= drain;
        animal.energy = Math.min(110, animal.energy + drain * 1.15
          - 0.22 * animal.genome.metabolism * world.rules.metabolism);
        animal.age++;
        if (animal.energy <= 0 || animal.age > 300) {
          alive[organismIndex] = false;
          deathsNow++;
          const remains = indexOf(animal.x, animal.y, world.width);
          detritus[remains] = Math.min(15, detritus[remains] + 1);
          continue;
        }
      }
      if (animal.hostId >= 0) {
        const threshold = world.rules.reproductionThreshold * 0.72;
        if (animal.energy > threshold && random() < animal.genome.fertility * 1.5 && organisms.length < MAX_POPULATION) {
          const child = createOrganism(world.nextId + birthsNow, 'parasite', animal.x, animal.y, random, animal.hostId);
          child.energy = 25;
          child.genome = mutateGenome(animal.genome, world.rules.mutationRate, random);
          child.lineageId = animal.lineageId;
          if (splitLineage(animal, child, world.rules.mutationRate)) {
            child.lineageId = nextLineageId++;
            newLineages.add(child.lineageId);
          }
          animal.energy -= 22;
          organisms.push(child);
          alive.push(true);
          idToIndex.set(child.id, organisms.length - 1);
          birthsNow++;
        }
        continue;
      }
    }

    animal.age++;
    const baseMetabolism = animal.species === 'grazer' ? 0.44
      : animal.species === 'hunter' ? 0.68
        : animal.species === 'omnivore' ? 0.55
          : animal.species === 'microbe' ? 0.16 : 0.35;
    animal.energy -= baseMetabolism * animal.genome.metabolism * world.rules.metabolism * habitatPenalty(animal, world);
    const lifespan = animal.species === 'microbe' ? 240 : animal.species === 'parasite' ? 300 : animal.species === 'hunter' ? 480 : 560;
    if (animal.energy <= 0 || animal.age > lifespan) {
      alive[organismIndex] = false;
      const oldIndex = indexOf(animal.x, animal.y, world.width);
      if (occupancy[oldIndex] === organismIndex) occupancy[oldIndex] = -1;
      detritus[oldIndex] = Math.min(15, detritus[oldIndex] + (animal.species === 'microbe' ? 1 : 3));
      deathsNow++;
      continue;
    }

    const here = indexOf(animal.x, animal.y, world.width);
    if (animal.species === 'microbe') {
      if (detritus[here] > 0) {
        detritus[here]--;
        animal.energy = Math.min(100, animal.energy + 3.5 * animal.genome.efficiency);
        fertility[here] = Math.round(clamp(fertility[here] + 1.2 * animal.genome.efficiency, 0, 255));
      } else if (random() < 0.35) {
        const position = findNeighborPosition(animal, occupancy, world, random);
        if (position) {
          occupancy[here] = -1;
          animal.x = position.x;
          animal.y = position.y;
          occupancy[indexOf(animal.x, animal.y, world.width)] = organismIndex;
        }
      }
    } else if (animal.species === 'grazer') {
      const threat = nearestThreat(animal, organisms, alive, occupancy, world);
      if (threat && threat.distance <= 4) {
        animal.threatX = threat.x;
        animal.threatY = threat.y;
        moveOneStep(organismIndex, animal, threat.x, threat.y, occupancy, world, random, true);
      } else {
        if (food[here] > 0) {
          const eaten = Math.min(food[here], 1 + Math.floor(animal.genome.efficiency * 1.4));
          food[here] -= eaten;
          animal.energy = Math.min(150, animal.energy + eaten * 2.5 * animal.genome.efficiency);
          animal.memoryX = -1;
          animal.memoryY = -1;
        }
        if (animal.energy < 120) {
          const target = nearestFood(animal, { ...world, food, fertility }, animal.genome.vision) ?? preferredTarget(animal, { ...world, food });
          if (target) {
            animal.memoryX = target.x;
            animal.memoryY = target.y;
            moveToward(organismIndex, animal, target.x, target.y, occupancy, world, random);
          } else {
            const flock = socialTarget(animal, organisms, alive, world);
            if (flock) moveToward(organismIndex, animal, flock.x, flock.y, occupancy, world, random);
            else if (random() < 0.1) {
              const position = findNeighborPosition(animal, occupancy, world, random);
              if (position) {
                occupancy[here] = -1; animal.x = position.x; animal.y = position.y;
                occupancy[indexOf(animal.x, animal.y, world.width)] = organismIndex;
              }
            }
          }
        }
      }
    } else if (animal.species === 'hunter' || animal.species === 'omnivore') {
      const hungry = animal.energy < (animal.species === 'hunter' ? 125 : 95);
      if (animal.species === 'omnivore' && food[here] > 0) {
        food[here]--;
        animal.energy = Math.min(140, animal.energy + 3 * animal.genome.efficiency);
      }
      const prey = nearestPrey(animal, organisms, alive, occupancy, world, animal.genome.vision);
      const shouldHunt = animal.species === 'hunter' || (hungry && random() < animal.genome.aggression * 0.5);
      if (prey && shouldHunt) {
        if (prey.distance <= 1.01) {
          const preyAnimal = organisms[prey.preyIndex];
          const chance = clamp(0.48 + animal.genome.aggression * 0.35 - preyAnimal.genome.camouflage * 0.18, 0.12, 0.92) * world.rules.predationPressure;
          if (random() < clamp(chance, 0.05, 0.98)) {
            alive[prey.preyIndex] = false;
            occupancy[indexOf(preyAnimal.x, preyAnimal.y, world.width)] = -1;
            detritus[indexOf(preyAnimal.x, preyAnimal.y, world.width)] = Math.min(15, detritus[indexOf(preyAnimal.x, preyAnimal.y, world.width)] + 2);
            animal.energy = Math.min(150, animal.energy + (animal.species === 'hunter' ? 42 : 24));
            deathsNow++;
            predationsNow++;
          } else {
            moveToward(organismIndex, animal, prey.x, prey.y, occupancy, world, random);
          }
        } else moveToward(organismIndex, animal, prey.x, prey.y, occupancy, world, random);
      } else if (animal.species === 'hunter') {
        const rival = nearestTerritoryRival(animal, organisms, alive, occupancy, world);
        if (rival) {
          const opponent = organisms[rival.rivalIndex];
          if (animal.genome.aggression >= opponent.genome.aggression) {
            const wound = 2.5 + animal.genome.aggression * 5;
            opponent.energy -= wound;
            animal.energy -= 1.2 + opponent.genome.aggression * 1.5;
            if (opponent.energy <= 0) {
              alive[rival.rivalIndex] = false;
              const rivalCell = indexOf(opponent.x, opponent.y, world.width);
              occupancy[rivalCell] = -1;
              detritus[rivalCell] = Math.min(15, detritus[rivalCell] + 3);
              deathsNow++;
              predationsNow++;
            }
          } else {
            moveOneStep(organismIndex, animal, rival.x, rival.y, occupancy, world, random, true);
          }
        } else {
          const dx = wrappedDelta(animal.x, animal.territoryX, world.width);
          const dy = wrappedDelta(animal.y, animal.territoryY, world.height);
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 8) moveToward(organismIndex, animal, animal.territoryX, animal.territoryY, occupancy, world, random);
          else if (random() < 0.16) {
            const position = findNeighborPosition(animal, occupancy, world, random);
            if (position) { occupancy[here] = -1; animal.x = position.x; animal.y = position.y; occupancy[indexOf(animal.x, animal.y, world.width)] = organismIndex; }
          }
        }
      } else if (random() < 0.08) {
        const position = findNeighborPosition(animal, occupancy, world, random);
        if (position) { occupancy[here] = -1; animal.x = position.x; animal.y = position.y; occupancy[indexOf(animal.x, animal.y, world.width)] = organismIndex; }
      }
    } else if (animal.species === 'parasite') {
      const host = nearestHost(animal, organisms, alive, occupancy, world, animal.genome.vision);
      if (host && host.distance <= 1.01) {
        const targetIndex = host.hostIndex;
        const target = organisms[targetIndex];
        const oldPosition = indexOf(animal.x, animal.y, world.width);
        if (occupancy[oldPosition] === organismIndex) occupancy[oldPosition] = -1;
        animal.hostId = target.id;
        animal.x = target.x;
        animal.y = target.y;
      } else if (host) moveToward(organismIndex, animal, host.x, host.y, occupancy, world, random);
      else if (random() < 0.2) {
        const position = findNeighborPosition(animal, occupancy, world, random);
        if (position) { occupancy[here] = -1; animal.x = position.x; animal.y = position.y; occupancy[indexOf(animal.x, animal.y, world.width)] = organismIndex; }
      }
    }

    if (!alive[organismIndex] || animal.species === 'parasite' || animal.species === 'microbe') continue;
    const threshold = world.rules.reproductionThreshold + (animal.species === 'hunter' ? 20 : animal.species === 'omnivore' ? 8 : 0);
    if (animal.age >= 16 && animal.energy >= threshold && organisms.length < MAX_POPULATION && random() < animal.genome.fertility) {
      const position = findNeighborPosition(animal, occupancy, world, random);
      if (position) {
        const child = createOrganism(world.nextId + birthsNow, animal.species, position.x, position.y, random);
        child.energy = 35;
        child.genome = mutateGenome(animal.genome, world.rules.mutationRate, random);
        child.lineageId = animal.lineageId;
        if (splitLineage(animal, child, world.rules.mutationRate, random)) {
          child.lineageId = nextLineageId++;
          newLineages.add(child.lineageId);
        }
        child.territoryX = animal.territoryX;
        child.territoryY = animal.territoryY;
        animal.energy -= 30;
        organisms.push(child);
        alive.push(true);
        occupancy[indexOf(position.x, position.y, world.width)] = organisms.length - 1;
        birthsNow++;
      }
    }
  }

  // Parasites may have been processed before their host moved or died later
  // in this same shuffled generation. Reconcile every host link against the
  // final positions before returning a snapshot.
  for (let index = 0; index < organisms.length; index++) {
    const parasite = organisms[index];
    if (!alive[index] || parasite.species !== 'parasite' || parasite.hostId < 0) continue;
    const hostIndex = idToIndex.get(parasite.hostId);
    if (hostIndex !== undefined && alive[hostIndex]) {
      const host = organisms[hostIndex];
      parasite.x = host.x;
      parasite.y = host.y;
      continue;
    }

    parasite.hostId = -1;
    const freePosition = findNeighborPosition(parasite, occupancy, world, random);
    if (freePosition) {
      parasite.x = freePosition.x;
      parasite.y = freePosition.y;
      occupancy[indexOf(parasite.x, parasite.y, world.width)] = index;
    } else {
      alive[index] = false;
      deathsNow++;
      const remains = indexOf(parasite.x, parasite.y, world.width);
      detritus[remains] = Math.min(15, detritus[remains] + 1);
    }
  }

  const survivors = organisms.filter((_, index) => alive[index]);
  const previousCounts = countsOf(world.organisms);
  const nextCounts = countsOf(survivors);
  const events = [...world.eventLog, ...climate.events].slice(-MAX_EVENTS);
  if (birthsNow > 0 && (world.generation + 1) % 20 === 0) addEvent(events, world.generation + 1, 'birth', 'Thế hệ mới xuất hiện', birthsNow + ' cá thể được sinh ra trong lượt mô phỏng này.');
  if (predationsNow >= 3) addEvent(events, world.generation + 1, 'predation', 'Áp lực săn mồi tăng', predationsNow + ' cuộc săn thành công trong thế hệ này.');
  if (newLineages.size > 0) addEvent(events, world.generation + 1, 'speciation', 'Dòng di truyền phân nhánh', newLineages.size + ' nhánh gene mới hình thành sau các đột biến lớn. Đây là phân nhánh di truyền trong mô hình, chưa khẳng định cách ly sinh sản.');
  for (const species of SPECIES_IDS) {
    if (previousCounts[species] > 0 && nextCounts[species] === 0) {
      addEvent(events, world.generation + 1, 'extinction', 'Một loài biến mất', SPECIES.find((entry) => entry.id === species)?.name + ' đã tuyệt chủng trong mô phỏng.');
    }
    if (previousCounts[species] >= 8 && nextCounts[species] < previousCounts[species] * 0.55) {
      addEvent(events, world.generation + 1, 'crash', 'Quần thể suy giảm mạnh', SPECIES.find((entry) => entry.id === species)?.name + ' giảm hơn 45% trong một thế hệ.');
    }
    if (previousCounts[species] > 0 && nextCounts[species] > previousCounts[species] * 1.7 && nextCounts[species] >= 12) {
      addEvent(events, world.generation + 1, 'boom', 'Quần thể tăng nhanh', SPECIES.find((entry) => entry.id === species)?.name + ' tăng hơn 70% so với thế hệ trước.');
    }
  }

  return {
    ...world,
    generation: world.generation + 1,
    rngState: randomState.state,
    nextId: world.nextId + birthsNow,
    nextLineageId,
    food,
    detritus,
    humidity,
    temperature,
    fertility,
    organisms: survivors,
    births: world.births + birthsNow,
    deaths: world.deaths + deathsNow,
    season: climate.season,
    weather: climate.weather,
    weatherRemaining: climate.remaining,
    eventLog: events,
  };
}

export function getLivingWorldStats(world: LivingWorld): LivingWorldStats {
  const counts = countsOf(world.organisms);
  const sums: WorldGenome = {
    metabolism: 0, vision: 0, fertility: 0, speed: 0, sociality: 0,
    aggression: 0, camouflage: 0, immunity: 0, efficiency: 0, virulence: 0,
  };
  let energy = 0;
  for (const animal of world.organisms) {
    energy += animal.energy;
    for (const key of Object.keys(sums) as Array<keyof WorldGenome>) sums[key] += animal.genome[key];
  }
  const population = world.organisms.length;
  if (population > 0) for (const key of Object.keys(sums) as Array<keyof WorldGenome>) sums[key] /= population;
  let foodUnits = 0;
  let detritusUnits = 0;
  let fertileTiles = 0;
  for (let index = 0; index < world.food.length; index++) {
    foodUnits += world.food[index];
    detritusUnits += world.detritus[index];
    if (world.fertility[index] >= 128) fertileTiles++;
  }
  const diversity = SPECIES_IDS.filter((species) => counts[species] > 0).length;
  const lineageDiversity = new Set(world.organisms.map((animal) => animal.lineageId)).size;
  return {
    population,
    counts,
    foodUnits,
    detritusUnits,
    averageEnergy: population ? energy / population : 0,
    averageTraits: sums,
    births: world.births,
    deaths: world.deaths,
    diversity,
    lineageDiversity,
    preyPredatorBalance: counts.hunter + counts.omnivore > 0
      ? counts.grazer / (counts.hunter + counts.omnivore)
      : counts.grazer,
    fertileTiles,
  };
}

export function serializeLivingWorld(world: LivingWorld): string {
  const encode = (array: Uint8Array) => Array.from(array, (value) => value.toString(16).padStart(2, '0')).join('');
  return JSON.stringify({
    version: 2,
    width: world.width,
    height: world.height,
    generation: world.generation,
    seed: world.seed,
    rngState: world.rngState,
    nextId: world.nextId,
    nextLineageId: world.nextLineageId,
    food: encode(world.food),
    detritus: encode(world.detritus),
    fertility: encode(world.fertility),
    humidity: encode(world.humidity),
    temperature: encode(world.temperature),
    elevation: encode(world.elevation),
    biomes: encode(world.biomes),
    organisms: world.organisms,
    births: world.births,
    deaths: world.deaths,
    season: world.season,
    weather: world.weather,
    weatherRemaining: world.weatherRemaining,
    rules: world.rules,
    eventLog: world.eventLog.slice(-MAX_EVENTS),
  });
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validRules(value: unknown): value is WorldRules {
  if (!value || typeof value !== 'object') return false;
  const rules = value as Record<string, unknown>;
  return finite(rules.foodRegrowth) && rules.foodRegrowth >= 0.001 && rules.foodRegrowth <= 0.12
    && finite(rules.metabolism) && rules.metabolism >= 0.3 && rules.metabolism <= 3
    && finite(rules.mutationRate) && rules.mutationRate >= 0 && rules.mutationRate <= 0.3
    && finite(rules.reproductionThreshold) && rules.reproductionThreshold >= 30 && rules.reproductionThreshold <= 150
    && finite(rules.predationPressure) && rules.predationPressure >= 0.2 && rules.predationPressure <= 2.5
    && finite(rules.diseasePressure) && rules.diseasePressure >= 0 && rules.diseasePressure <= 2.5
    && finite(rules.climateIntensity) && rules.climateIntensity >= 0.3 && rules.climateIntensity <= 2.5;
}

function decodeArray(value: unknown, length: number, maxValue = 255): Uint8Array | null {
  if (typeof value !== 'string' || value.length !== length * 2) return null;
  const output = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    const parsed = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > maxValue) return null;
    output[i] = parsed;
  }
  return output;
}

function validGenome(value: unknown): value is WorldGenome {
  if (!value || typeof value !== 'object') return false;
  const genome = value as Record<string, unknown>;
  return finite(genome.metabolism) && genome.metabolism >= 0.45 && genome.metabolism <= 1.6
    && finite(genome.vision) && Number.isInteger(genome.vision) && genome.vision >= 2 && genome.vision <= 12
    && finite(genome.fertility) && genome.fertility >= 0.008 && genome.fertility <= 0.08
    && finite(genome.speed) && genome.speed >= 0.45 && genome.speed <= 1.9
    && finite(genome.sociality) && genome.sociality >= 0 && genome.sociality <= 1
    && finite(genome.aggression) && genome.aggression >= 0 && genome.aggression <= 1
    && finite(genome.camouflage) && genome.camouflage >= 0 && genome.camouflage <= 1
    && finite(genome.immunity) && genome.immunity >= 0 && genome.immunity <= 1
    && finite(genome.efficiency) && genome.efficiency >= 0.45 && genome.efficiency <= 1.8
    && finite(genome.virulence) && genome.virulence >= 0 && genome.virulence <= 1;
}

export function deserializeLivingWorld(value: unknown): LivingWorld | null {
  if (typeof value !== 'string' || value.length > MAX_SNAPSHOT_LENGTH) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.version !== 2 || !finite(parsed.width) || !Number.isInteger(parsed.width)
      || !finite(parsed.height) || !Number.isInteger(parsed.height)) return null;
    const width = parsed.width;
    const height = parsed.height;
    const total = width * height;
    if (width < MIN_WIDTH || width > MAX_WIDTH || height < MIN_HEIGHT || height > MAX_HEIGHT || total > MAX_CELLS) return null;
    const seed = parsed.seed;
    const rngState = parsed.rngState;
    if (!finite(seed) || !Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) return null;
    if (!finite(rngState) || !Number.isInteger(rngState) || rngState < 0 || rngState > 0xffff_ffff) return null;
    if (!finite(parsed.generation) || !Number.isInteger(parsed.generation) || parsed.generation < 0) return null;
    if (!finite(parsed.nextId) || !Number.isInteger(parsed.nextId) || parsed.nextId < 1 || parsed.nextId > 2_000_000_000) return null;
    if (!finite(parsed.nextLineageId) || !Number.isInteger(parsed.nextLineageId) || parsed.nextLineageId < SPECIES_IDS.length + 1 || parsed.nextLineageId > 2_000_000_000) return null;
    if (!finite(parsed.births) || !Number.isInteger(parsed.births) || parsed.births < 0) return null;
    if (!finite(parsed.deaths) || !Number.isInteger(parsed.deaths) || parsed.deaths < 0) return null;
    if (!SEASON_IDS.includes(parsed.season as SeasonId) || !WEATHER_IDS.includes(parsed.weather as WeatherId)) return null;
    if (!finite(parsed.weatherRemaining) || !Number.isInteger(parsed.weatherRemaining) || parsed.weatherRemaining < 0 || parsed.weatherRemaining > 30) return null;
    if (!validRules(parsed.rules)) return null;
    const food = decodeArray(parsed.food, total, 15);
    const detritus = decodeArray(parsed.detritus, total, 15);
    const fertility = decodeArray(parsed.fertility, total);
    const humidity = decodeArray(parsed.humidity, total);
    const temperature = decodeArray(parsed.temperature, total);
    const elevation = decodeArray(parsed.elevation, total);
    const biomes = decodeArray(parsed.biomes, total, BIOME_IDS.length - 1);
    if (!food || !detritus || !fertility || !humidity || !temperature || !elevation || !biomes) return null;
    if (!Array.isArray(parsed.organisms) || parsed.organisms.length > MAX_POPULATION) return null;
    const organisms: WorldOrganism[] = [];
    const ids = new Set<number>();
    const occupied = new Set<number>();
    for (const item of parsed.organisms) {
      if (!item || typeof item !== 'object') return null;
      const animal = item as Record<string, unknown>;
      if (!finite(animal.id) || !Number.isInteger(animal.id) || animal.id < 1 || ids.has(animal.id)) return null;
      if (!SPECIES_IDS.includes(animal.species as SpeciesId)) return null;
      if (!finite(animal.x) || !Number.isInteger(animal.x) || animal.x < 0 || animal.x >= width) return null;
      if (!finite(animal.y) || !Number.isInteger(animal.y) || animal.y < 0 || animal.y >= height) return null;
      if (!finite(animal.energy) || animal.energy < 0 || animal.energy > 160) return null;
      if (!finite(animal.age) || !Number.isInteger(animal.age) || animal.age < 0 || animal.age > 1_000_000) return null;
      if (!validGenome(animal.genome)) return null;
      for (const key of ['memoryX', 'memoryY', 'threatX', 'threatY', 'territoryX', 'territoryY', 'hostId'] as const) {
        if (!finite(animal[key]) || !Number.isInteger(animal[key])) return null;
      }
      if (!finite(animal.lineageId) || !Number.isInteger(animal.lineageId)
        || animal.lineageId < 1 || animal.lineageId >= Number(parsed.nextLineageId)) return null;

      // All numeric properties below have been validated above; use a narrowed view
      // rather than allowing untrusted JSON values to flow into the world model.
      const numeric = animal as Record<string, number>;
      if (numeric.memoryX < -1 || numeric.memoryX >= width || numeric.memoryY < -1 || numeric.memoryY >= height) return null;
      if (numeric.threatX < -1 || numeric.threatX >= width || numeric.threatY < -1 || numeric.threatY >= height) return null;
      if (numeric.territoryX < 0 || numeric.territoryX >= width || numeric.territoryY < 0 || numeric.territoryY >= height) return null;
      if (animal.species === 'parasite') {
        if (numeric.hostId < -1 || (numeric.hostId >= 0 && numeric.hostId === numeric.id)) return null;
      } else if (numeric.hostId !== -1) return null;
      const position = indexOf(numeric.x, numeric.y, width);
      if (animal.species !== 'parasite' || numeric.hostId < 0) {
        if (occupied.has(position)) return null;
        occupied.add(position);
      }
      ids.add(numeric.id);
      organisms.push({
        id: numeric.id,
        species: animal.species as SpeciesId,
        x: numeric.x,
        y: numeric.y,
        energy: numeric.energy,
        age: numeric.age,
        genome: { ...(animal.genome as WorldGenome) },
        memoryX: numeric.memoryX,
        memoryY: numeric.memoryY,
        threatX: numeric.threatX,
        threatY: numeric.threatY,
        territoryX: numeric.territoryX,
        territoryY: numeric.territoryY,
        hostId: numeric.hostId,
        lineageId: numeric.lineageId,
      });
    }
    const validIds = new Set(organisms.map((animal) => animal.id));
    for (const animal of organisms) {
      if (animal.hostId >= 0 && (!validIds.has(animal.hostId) || !organisms.some((host) => host.id === animal.hostId && (host.species === 'grazer' || host.species === 'omnivore')))) return null;
    }
    if (ids.size > 0 && parsed.nextId <= Math.max(...ids)) return null;
    const eventLog = Array.isArray(parsed.eventLog) ? parsed.eventLog.slice(-MAX_EVENTS) : [];
    for (const event of eventLog) {
      if (!event || typeof event !== 'object') return null;
      const record = event as Record<string, unknown>;
      if (!finite(record.id) || !Number.isInteger(record.id) || !finite(record.generation) || !Number.isInteger(record.generation) || record.generation < 0) return null;
      if (!['season', 'weather', 'birth', 'predation', 'extinction', 'boom', 'crash', 'speciation', 'milestone'].includes(String(record.type))) return null;
      if (typeof record.title !== 'string' || record.title.length > 120 || typeof record.detail !== 'string' || record.detail.length > 320) return null;
    }
    return {
      width,
      height,
      generation: Math.min(10_000_000, parsed.generation),
      seed,
      rngState,
      nextId: parsed.nextId,
      nextLineageId: parsed.nextLineageId,
      food,
      detritus,
      fertility,
      humidity,
      temperature,
      elevation,
      biomes,
      organisms,
      births: Math.min(parsed.births, 2_000_000_000),
      deaths: Math.min(parsed.deaths, 2_000_000_000),
      season: parsed.season as SeasonId,
      weather: parsed.weather as WeatherId,
      weatherRemaining: parsed.weatherRemaining,
      rules: { ...(parsed.rules as WorldRules) },
      eventLog: eventLog as WorldEvent[],
    };
  } catch {
    return null;
  }
}

export function compareLivingWorlds(left: LivingWorld, right: LivingWorld): {
  generation: number;
  populationDelta: number;
  species: Record<SpeciesId, number>;
  foodDelta: number;
  birthDelta: number;
  deathDelta: number;
  diversityDelta: number;
  lineageDiversityDelta: number;
  traitDifferences: Partial<Record<keyof WorldGenome, number>>;
} {
  const a = getLivingWorldStats(left);
  const b = getLivingWorldStats(right);
  const species = {} as Record<SpeciesId, number>;
  for (const id of SPECIES_IDS) species[id] = b.counts[id] - a.counts[id];
  const traitDifferences: Partial<Record<keyof WorldGenome, number>> = {};
  for (const key of Object.keys(a.averageTraits) as Array<keyof WorldGenome>) {
    traitDifferences[key] = b.averageTraits[key] - a.averageTraits[key];
  }
  return {
    generation: right.generation - left.generation,
    populationDelta: b.population - a.population,
    species,
    foodDelta: b.foodUnits - a.foodUnits,
    birthDelta: b.births - a.births,
    deathDelta: b.deaths - a.deaths,
    diversityDelta: b.diversity - a.diversity,
    lineageDiversityDelta: b.lineageDiversity - a.lineageDiversity,
    traitDifferences,
  };
}
