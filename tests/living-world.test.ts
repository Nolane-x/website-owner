import { describe, expect, it } from 'vitest';
import {
  BIOMES,
  compareLivingWorlds,
  createLivingWorld,
  deserializeLivingWorld,
  getLivingWorldStats,
  serializeLivingWorld,
  stepLivingWorld,
  type LivingWorld,
  type WorldGenome,
  type WorldOrganism,
} from '@/lib/life-lab/living-world';

function withChanges(world: LivingWorld, changes: Partial<LivingWorld>): LivingWorld {
  return { ...world, ...changes };
}

type OrganismChanges = Omit<Partial<WorldOrganism>, 'genome'> & { genome?: Partial<WorldGenome> };

function makeOrganism(
  base: WorldOrganism,
  changes: OrganismChanges,
): WorldOrganism {
  return {
    ...base,
    ...changes,
    genome: { ...base.genome, ...(changes.genome ?? {}) },
  };
}

describe('Evolution Lab Living World engine', () => {
  it('creates a bounded seeded planet with multiple biomes and all environmental fields', () => {
    const world = createLivingWorld(42, 999, 2);
    expect(world.width).toBeLessThanOrEqual(90);
    expect(world.height).toBeGreaterThanOrEqual(20);
    expect(world.width * world.height).toBeLessThanOrEqual(5400);
    for (const field of [world.food, world.detritus, world.fertility, world.humidity, world.temperature, world.elevation, world.biomes]) {
      expect(field).toHaveLength(world.width * world.height);
    }
    expect(new Set(world.biomes).size).toBeGreaterThanOrEqual(3);
    expect(BIOMES).toHaveLength(6);
    expect(world.generation).toBe(0);
    expect(world.season).toBe('spring');
  });

  it('carves a connected water corridor across every column of the generated map', () => {
    const world = createLivingWorld(90210, 60, 36, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const centerline: number[] = [];
    for (let x = 0; x < world.width; x++) {
      const waterRows: number[] = [];
      for (let y = 0; y < world.height; y++) {
        if (world.biomes[y * world.width + x] === 4) waterRows.push(y);
      }
      expect(waterRows.length).toBeGreaterThan(0);
      centerline.push(waterRows[Math.floor(waterRows.length / 2)]);
    }
    for (let x = 1; x < centerline.length; x++) {
      expect(Math.abs(centerline[x] - centerline[x - 1])).toBeLessThanOrEqual(2);
    }
  });

  it('creates a deterministic world and keeps its random stream reproducible over many generations', () => {
    let left = createLivingWorld(20261101, 48, 30, { grazer: 22, hunter: 5, omnivore: 7, parasite: 4, microbe: 12 });
    let right = createLivingWorld(20261101, 48, 30, { grazer: 22, hunter: 5, omnivore: 7, parasite: 4, microbe: 12 });
    for (let generation = 0; generation < 60; generation++) {
      left = stepLivingWorld(left);
      right = stepLivingWorld(right);
    }
    expect(left.food).toEqual(right.food);
    expect(left.fertility).toEqual(right.fertility);
    expect(left.humidity).toEqual(right.humidity);
    expect(left.organisms).toEqual(right.organisms);
    expect(left.rngState).toBe(right.rngState);
    expect(left.eventLog).toEqual(right.eventLog);
    expect(left.generation).toBe(60);
  });

  it('keeps a seeded climate-only world deterministic and bounded for 1,000 generations', () => {
    const empty = { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 };
    let left = createLivingWorld(1_000_777, 32, 20, empty);
    let right = createLivingWorld(1_000_777, 32, 20, empty);
    for (let generation = 0; generation < 1_000; generation++) {
      left = stepLivingWorld(left);
      right = stepLivingWorld(right);
    }
    expect(left.generation).toBe(1_000);
    expect(left.season).toBe('spring');
    expect(left.organisms).toHaveLength(0);
    expect(left.food).toEqual(right.food);
    expect(left.humidity).toEqual(right.humidity);
    expect(left.temperature).toEqual(right.temperature);
    expect(left.rngState).toBe(right.rngState);
    expect(left.eventLog.length).toBeLessThanOrEqual(64);
    expect(Array.from(left.food).every((value) => value >= 0 && value <= 15)).toBe(true);
  });

  it('advances seasons and records weather changes in the world event timeline', () => {
    const base = createLivingWorld(88, 32, 20, { grazer: 2, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const world = withChanges(base, {
      generation: 79,
      season: 'spring',
      weather: 'clear',
      weatherRemaining: 1,
    });
    const next = stepLivingWorld(world);
    expect(next.season).toBe('summer');
    expect(next.eventLog.some((event) => event.type === 'season' && event.generation === 80)).toBe(true);
  });

  it('cycles through all four seasons and returns to spring', () => {
    let world = createLivingWorld(120, 32, 20, { grazer: 1, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const expected = ['summer', 'autumn', 'winter', 'spring'] as const;
    for (const season of expected) {
      world = { ...world, generation: world.generation + (80 - (world.generation % 80)) - 1 };
      world = stepLivingWorld(world);
      expect(world.season).toBe(season);
      expect(world.eventLog.some((event) => event.type === 'season' && event.generation === world.generation)).toBe(true);
    }
  });

  it('lets rain restore more vegetation than drought under the same seeded random stream', () => {
    const base = createLivingWorld(144, 48, 30, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const initialFood = new Uint8Array(base.food.length).fill(1);
    const fertile = new Uint8Array(base.fertility.length).fill(220);
    const moist = new Uint8Array(base.humidity.length).fill(180);
    const dry = new Uint8Array(base.humidity.length).fill(35);
    const rainWorld = withChanges(base, {
      food: new Uint8Array(initialFood),
      fertility: new Uint8Array(fertile),
      humidity: new Uint8Array(moist),
      weather: 'rain',
      weatherRemaining: 8,
      rules: { ...base.rules, foodRegrowth: 0.12 },
    });
    const droughtWorld = withChanges(base, {
      food: new Uint8Array(initialFood),
      fertility: new Uint8Array(fertile),
      humidity: new Uint8Array(dry),
      weather: 'drought',
      weatherRemaining: 8,
      rules: { ...base.rules, foodRegrowth: 0.12 },
    });
    const rain = stepLivingWorld(rainWorld);
    const drought = stepLivingWorld(droughtWorld);
    expect(rain.food.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(drought.food.reduce((sum, value) => sum + value, 0));
  });

  it('keeps organisms in bounds without overlapping mobile cells across many generations', () => {
    let world = createLivingWorld(2026, 44, 28, { grazer: 26, hunter: 6, omnivore: 8, parasite: 6, microbe: 16 });
    for (let generation = 0; generation < 100; generation++) {
      world = stepLivingWorld(world);
      const occupied = new Set<number>();
      const byId = new Map(world.organisms.map((animal) => [animal.id, animal]));
      for (const animal of world.organisms) {
        expect(animal.x).toBeGreaterThanOrEqual(0);
        expect(animal.x).toBeLessThan(world.width);
        expect(animal.y).toBeGreaterThanOrEqual(0);
        expect(animal.y).toBeLessThan(world.height);
        if (animal.species === 'parasite' && animal.hostId >= 0) {
          const host = byId.get(animal.hostId);
          expect(host).toBeDefined();
          expect(host?.species === 'grazer' || host?.species === 'omnivore').toBe(true);
          expect(animal.x).toBe(host?.x);
          expect(animal.y).toBe(host?.y);
          continue;
        }
        const position = animal.y * world.width + animal.x;
        expect(occupied.has(position)).toBe(false);
        occupied.add(position);
      }
    }
  });

  it('lets a hunter attack prey and records the resulting death', () => {
    const base = createLivingWorld(9, 32, 20, { grazer: 1, hunter: 1, omnivore: 0, parasite: 0, microbe: 0 });
    const grazer = base.organisms.find((animal) => animal.species === 'grazer');
    const hunter = base.organisms.find((animal) => animal.species === 'hunter');
    expect(grazer).toBeDefined();
    expect(hunter).toBeDefined();
    const prey = makeOrganism(grazer!, {
      x: 10, y: 8, energy: 130, age: 30,
      genome: { camouflage: 0, sociality: 0, fertility: 0.008 },
    });
    const predator = makeOrganism(hunter!, {
      x: 11, y: 8, energy: 80, age: 30,
      genome: { vision: 12, aggression: 1, fertility: 0.008 },
    });
    const world = withChanges(base, {
      food: new Uint8Array(base.food.length),
      organisms: [prey, predator],
      rules: { ...base.rules, predationPressure: 2.5, reproductionThreshold: 150 },
    });
    const next = stepLivingWorld(world);
    expect(getLivingWorldStats(next).counts.grazer).toBe(0);
    expect(getLivingWorldStats(next).counts.hunter).toBe(1);
    expect(next.deaths).toBeGreaterThanOrEqual(1);
  });

  it('makes aggressive hunters contest overlapping territories when prey is absent', () => {
    const base = createLivingWorld(199, 32, 20, { grazer: 0, hunter: 2, omnivore: 0, parasite: 0, microbe: 0 });
    const hunters = base.organisms.map((animal, index) => makeOrganism(animal, {
      x: index === 0 ? 10 : 11,
      y: 8,
      territoryX: 10,
      territoryY: 8,
      energy: index === 0 ? 2 : 110,
      age: 30,
      genome: { vision: 8, aggression: index === 0 ? 0.05 : 1, fertility: 0.008 },
    }));
    const biomes = new Uint8Array(base.biomes.length).fill(4);
    biomes[8 * base.width + 10] = 0;
    biomes[8 * base.width + 11] = 0;
    const world = withChanges(base, {
      biomes,
      food: new Uint8Array(base.food.length),
      organisms: hunters,
      rules: { ...base.rules, reproductionThreshold: 150, foodRegrowth: 0.001 },
    });
    const next = stepLivingWorld(world);
    expect(next.deaths).toBeGreaterThanOrEqual(1);
    expect(next.organisms.filter((animal) => animal.species === 'hunter').length).toBe(1);
    expect(next.organisms.find((animal) => animal.species === 'hunter')?.genome.aggression).toBe(1);
  });

  it('models parasite attachment as a drain on host energy', () => {
    const base = createLivingWorld(11, 32, 20, { grazer: 1, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const host = base.organisms[0];
    const parasite: WorldOrganism = {
      ...makeOrganism(host, {
        id: host.id + 10,
        species: 'parasite',
        energy: 70,
        age: 20,
        hostId: host.id,
        genome: { metabolism: 0.6, fertility: 0.008, virulence: 0.9 },
      }),
      hostId: host.id,
    };
    const world = withChanges(base, {
      food: new Uint8Array(base.food.length),
      organisms: [makeOrganism(host, { energy: 75, age: 25, genome: { immunity: 0 } }), parasite],
      nextId: host.id + 20,
      rules: { ...base.rules, diseasePressure: 2, reproductionThreshold: 150, foodRegrowth: 0.001 },
    });
    const next = stepLivingWorld(world);
    const nextHost = next.organisms.find((animal) => animal.id === host.id);
    const nextParasite = next.organisms.find((animal) => animal.species === 'parasite');
    expect(nextHost).toBeDefined();
    expect(nextHost!.energy).toBeLessThan(75);
    expect(nextParasite).toBeDefined();
    expect(nextParasite!.hostId).toBe(host.id);
  });

  it('enforces lifespan and metabolic cost for parasites attached to a living host', () => {
    const base = createLivingWorld(77, 32, 20, { grazer: 1, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const host = makeOrganism(base.organisms[0], { energy: 140, age: 20, genome: { immunity: 1 } });
    const parasite = makeOrganism(host, {
      id: host.id + 10,
      species: 'parasite',
      energy: 0.1,
      age: 300,
      hostId: host.id,
      genome: { metabolism: 1.6, virulence: 0, fertility: 0.008 },
    });
    const world = withChanges(base, {
      organisms: [host, parasite],
      nextId: host.id + 20,
      rules: { ...base.rules, diseasePressure: 0, metabolism: 3, reproductionThreshold: 150 },
    });
    const next = stepLivingWorld(world);
    expect(next.organisms.some((animal) => animal.id === parasite.id)).toBe(false);
    expect(next.organisms.some((animal) => animal.id === host.id)).toBe(true);
    expect(next.deaths).toBe(1);
  });

  it('germinates dormant seeds in warm, wet spring conditions', () => {
    const base = createLivingWorld(6_006, 32, 20, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const world = withChanges(base, {
      biomes: new Uint8Array(base.biomes.length).fill(0),
      food: new Uint8Array(base.food.length),
      seedBank: new Uint8Array(base.seedBank.length).fill(15),
      fertility: new Uint8Array(base.fertility.length).fill(255),
      humidity: new Uint8Array(base.humidity.length).fill(255),
      temperature: new Uint8Array(base.temperature.length).fill(160),
      season: 'spring',
      weather: 'rain',
      weatherRemaining: 8,
      rules: { ...base.rules, foodRegrowth: 0.001, climateIntensity: 0.3 },
    });
    const beforeSeeds = world.seedBank.reduce((sum, value) => sum + value, 0);
    const next = stepLivingWorld(world);
    const afterSeeds = next.seedBank.reduce((sum, value) => sum + value, 0);
    const newBiomass = next.food.reduce((sum, value) => sum + value, 0);
    expect(afterSeeds).toBeLessThan(beforeSeeds);
    expect(newBiomass).toBeGreaterThan(0);
  });

  it('disperses seeds from mature plant cover into nearby land cells', () => {
    const base = createLivingWorld(6_007, 32, 20, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const world = withChanges(base, {
      biomes: new Uint8Array(base.biomes.length).fill(0),
      food: new Uint8Array(base.food.length).fill(15),
      seedBank: new Uint8Array(base.seedBank.length).fill(2),
      season: 'spring',
      weather: 'clear',
      weatherRemaining: 8,
      rules: { ...base.rules, foodRegrowth: 0.001 },
    });
    const beforeSeeds = world.seedBank.reduce((sum, value) => sum + value, 0);
    const next = stepLivingWorld(world);
    const afterSeeds = next.seedBank.reduce((sum, value) => sum + value, 0);
    expect(afterSeeds).toBeGreaterThan(beforeSeeds);
  });

  it('lets microbes consume detritus and improve soil fertility', () => {
    const base = createLivingWorld(19, 32, 20, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 1 });
    const microbe = makeOrganism(base.organisms[0], { x: 8, y: 8, energy: 55, age: 3 });
    const position = microbe.y * base.width + microbe.x;
    const detritus = new Uint8Array(base.detritus);
    const fertility = new Uint8Array(base.fertility);
    detritus[position] = 10;
    fertility[position] = 80;
    const world = withChanges(base, {
      organisms: [microbe],
      detritus,
      fertility,
      rules: { ...base.rules, foodRegrowth: 0.001 },
    });
    const next = stepLivingWorld(world);
    expect(next.detritus[position]).toBeLessThan(10);
    expect(next.fertility[position]).toBeGreaterThan(80);
  });

  it('makes dry heat increase grazer energy costs under the same random stream', () => {
    const base = createLivingWorld(55, 32, 20, { grazer: 1, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const grazer = makeOrganism(base.organisms[0], { energy: 100, age: 30, genome: { metabolism: 1, efficiency: 1, fertility: 0.008 } });
    const biomes = new Uint8Array(base.biomes.length).fill(0);
    const food = new Uint8Array(base.food.length);
    const comfortable = withChanges(base, {
      biomes: new Uint8Array(biomes),
      food: new Uint8Array(food),
      temperature: new Uint8Array(base.temperature.length).fill(128),
      humidity: new Uint8Array(base.humidity.length).fill(128),
      organisms: [makeOrganism(grazer, {})],
      rules: { ...base.rules, metabolism: 1, climateIntensity: 0.3, reproductionThreshold: 150 },
    });
    const stressed = withChanges(base, {
      biomes: new Uint8Array(biomes),
      food: new Uint8Array(food),
      temperature: new Uint8Array(base.temperature.length).fill(250),
      humidity: new Uint8Array(base.humidity.length).fill(10),
      organisms: [makeOrganism(grazer, {})],
      rules: { ...base.rules, metabolism: 1, climateIntensity: 0.3, reproductionThreshold: 150 },
    });
    const comfortableNext = stepLivingWorld(comfortable);
    const stressedNext = stepLivingWorld(stressed);
    const comfortableEnergy = comfortableNext.organisms.find((animal) => animal.species === 'grazer')?.energy ?? 0;
    const stressedEnergy = stressedNext.organisms.find((animal) => animal.species === 'grazer')?.energy ?? 0;
    expect(stressedEnergy).toBeLessThan(comfortableEnergy);
  });

  it('turns wildfire damage into detritus in forest tiles', () => {
    const base = createLivingWorld(1234, 40, 24, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const biomes = new Uint8Array(base.biomes.length).fill(1);
    const world = withChanges(base, {
      biomes,
      food: new Uint8Array(base.food.length).fill(15),
      detritus: new Uint8Array(base.detritus.length),
      weather: 'wildfire',
      weatherRemaining: 8,
      rules: { ...base.rules, foodRegrowth: 0.001 },
    });
    const next = stepLivingWorld(world);
    expect(next.food.reduce((sum, value) => sum + value, 0)).toBeLessThan(world.food.reduce((sum, value) => sum + value, 0));
    expect(next.detritus.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
  });

  it('supports reproduction with bounded inherited mutations across ten gene dimensions', () => {
    const base = createLivingWorld(123, 36, 24, { grazer: 1, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const parent = makeOrganism(base.organisms[0], {
      energy: 150,
      age: 40,
      genome: { fertility: 0.08, metabolism: 0.45, immunity: 0.5 },
    });
    let world: LivingWorld = withChanges(base, {
      food: new Uint8Array(base.food.length).fill(15),
      organisms: [parent],
      rules: {
        ...base.rules,
        mutationRate: 0.3,
        metabolism: 0.3,
        reproductionThreshold: 30,
      },
    });
    for (let generation = 0; generation < 500 && getLivingWorldStats(world).lineageDiversity === 1; generation++) {
      world = stepLivingWorld(world);
    }
    expect(world.births).toBeGreaterThan(0);
    expect(world.organisms.length).toBeGreaterThan(1);
    expect(getLivingWorldStats(world).lineageDiversity).toBeGreaterThan(1);
    expect(world.eventLog.some((event) => event.type === 'speciation')).toBe(true);
    for (const animal of world.organisms) {
      const genome = animal.genome;
      expect(genome.metabolism).toBeGreaterThanOrEqual(0.45);
      expect(genome.metabolism).toBeLessThanOrEqual(1.6);
      expect(genome.vision).toBeGreaterThanOrEqual(2);
      expect(genome.vision).toBeLessThanOrEqual(12);
      expect(genome.fertility).toBeGreaterThanOrEqual(0.008);
      expect(genome.fertility).toBeLessThanOrEqual(0.08);
      expect(genome.speed).toBeGreaterThanOrEqual(0.45);
      expect(genome.speed).toBeLessThanOrEqual(1.9);
      expect(genome.immunity).toBeGreaterThanOrEqual(0);
      expect(genome.immunity).toBeLessThanOrEqual(1);
    }
  });

  it('round-trips the complete terrain, climate, population, genome and event timeline', () => {
    let world = createLivingWorld(77, 40, 26, { grazer: 14, hunter: 3, omnivore: 4, parasite: 3, microbe: 8 });
    for (let generation = 0; generation < 18; generation++) world = stepLivingWorld(world);
    const restored = deserializeLivingWorld(serializeLivingWorld(world));
    expect(restored).not.toBeNull();
    expect(restored?.food).toEqual(world.food);
    expect(restored?.seedBank).toEqual(world.seedBank);
    expect(restored?.detritus).toEqual(world.detritus);
    expect(restored?.biomes).toEqual(world.biomes);
    expect(restored?.temperature).toEqual(world.temperature);
    expect(restored?.humidity).toEqual(world.humidity);
    expect(restored?.organisms).toEqual(world.organisms);
    expect(restored?.rules).toEqual(world.rules);
    expect(restored?.eventLog).toEqual(world.eventLog);
    expect(restored?.rngState).toBe(world.rngState);
    expect(restored?.nextLineageId).toBe(world.nextLineageId);
  });

  it('rejects malformed, oversized, overlapping and invalid-genome world snapshots', () => {
    const world = createLivingWorld(88, 32, 20, { grazer: 2, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const valid = JSON.parse(serializeLivingWorld(world)) as Record<string, unknown>;
    expect(deserializeLivingWorld('not-json')).toBeNull();
    expect(deserializeLivingWorld('x'.repeat(500_001))).toBeNull();

    const badFood = { ...valid, food: 'ff' + String(valid.food).slice(2) };
    expect(deserializeLivingWorld(JSON.stringify(badFood))).toBeNull();

    const overlapping = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
    const organisms = overlapping.organisms as Array<Record<string, unknown>>;
    organisms[1] = { ...organisms[1], x: organisms[0].x, y: organisms[0].y };
    expect(deserializeLivingWorld(JSON.stringify(overlapping))).toBeNull();

    const badGenome = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
    const badOrganisms = badGenome.organisms as Array<Record<string, unknown>>;
    badOrganisms[0] = { ...badOrganisms[0], genome: { ...(badOrganisms[0].genome as Record<string, unknown>), virulence: 5 } };
    expect(deserializeLivingWorld(JSON.stringify(badGenome))).toBeNull();

    const badRules = { ...valid, rules: { ...(world.rules), mutationRate: 2 } };
    expect(deserializeLivingWorld(JSON.stringify(badRules))).toBeNull();
  });

  it('reports diversity, environmental resources and trait means without NaN', () => {
    const world = createLivingWorld(909, 32, 20, { grazer: 4, hunter: 2, omnivore: 3, parasite: 1, microbe: 4 });
    const stats = getLivingWorldStats(world);
    expect(stats.population).toBe(14);
    expect(stats.diversity).toBe(5);
    expect(stats.foodUnits).toBeGreaterThan(0);
    expect(stats.averageEnergy).toBeGreaterThan(0);
    expect(Number.isFinite(stats.averageTraits.immunity)).toBe(true);
    expect(stats.preyPredatorBalance).toBeGreaterThan(0);
  });

  it('compares two saved worlds by population, resources, species and gene traits', () => {
    const left = createLivingWorld(202, 32, 20, { grazer: 8, hunter: 2, omnivore: 2, parasite: 1, microbe: 4 });
    const right = createLivingWorld(202, 32, 20, { grazer: 10, hunter: 1, omnivore: 4, parasite: 0, microbe: 8 });
    const comparison = compareLivingWorlds(left, right);
    expect(comparison.populationDelta).toBe(6);
    expect(comparison.lineageDiversityDelta).toBe(-1);
    expect(comparison.species.grazer).toBe(2);
    expect(comparison.species.parasite).toBe(-1);
    expect(comparison.seedDelta).toBe(
      getLivingWorldStats(right).seedUnits - getLivingWorldStats(left).seedUnits,
    );
    expect(Number.isFinite(comparison.traitDifferences.sociality)).toBe(true);
  });

  it('handles a lifeless world and empty-population statistics safely', () => {
    const world = createLivingWorld(303, 32, 20, { grazer: 0, hunter: 0, omnivore: 0, parasite: 0, microbe: 0 });
    const stats = getLivingWorldStats(world);
    expect(stats.population).toBe(0);
    expect(stats.diversity).toBe(0);
    expect(stats.averageEnergy).toBe(0);
    expect(Number.isFinite(stats.averageTraits.vision)).toBe(true);
    expect(stepLivingWorld(world).generation).toBe(1);
  });
});
