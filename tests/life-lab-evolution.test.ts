import { describe, expect, it } from 'vitest';
import {
  createEcosystemWorld,
  deserializeEcosystem,
  getEcosystemStats,
  serializeEcosystem,
  stepEcosystem,
  type EcosystemWorld,
} from '@/lib/life-lab/ecosystem';

describe('Life Lab evolution ecosystem engine', () => {
  it('creates a bounded seeded world with distinct organism positions', () => {
    const world = createEcosystemWorld(42, 999, 2, 500, 500);
    expect(world.width).toBeLessThanOrEqual(120);
    expect(world.height).toBeGreaterThanOrEqual(16);
    expect(world.food).toHaveLength(world.width * world.height);
    expect(world.organisms.length).toBeLessThanOrEqual(360);
    expect(new Set(world.organisms.map((animal) => animal.y * world.width + animal.x)).size)
      .toBe(world.organisms.length);
    expect(world.generation).toBe(0);
  });

  it('produces reproducible initial worlds and deterministic generations from the same seed', () => {
    const first = createEcosystemWorld(987654, 48, 28, 22, 5);
    const second = createEcosystemWorld(987654, 48, 28, 22, 5);
    expect(first.food).toEqual(second.food);
    expect(first.organisms).toEqual(second.organisms);
    let left = first;
    let right = second;
    for (let generation = 0; generation < 24; generation++) {
      left = stepEcosystem(left);
      right = stepEcosystem(right);
    }
    expect(left.food).toEqual(right.food);
    expect(left.organisms).toEqual(right.organisms);
    expect(left.rngState).toBe(right.rngState);
    expect(left.generation).toBe(24);
  });

  it('lets a hunter consume an adjacent grazer and records the death', () => {
    const base = createEcosystemWorld(3, 24, 16, 1, 1);
    const organisms = base.organisms.map((animal, index) => ({
      ...animal,
      x: index === 0 ? 11 : 10,
      y: 8,
      energy: 60,
      age: 20,
      genome: { ...animal.genome, vision: 6 },
    }));
    const world = {
      ...base,
      food: new Uint8Array(base.food.length),
      organisms,
      rules: { ...base.rules, reproductionThreshold: 120 },
    };
    const next = stepEcosystem(world);
    const stats = getEcosystemStats(next);
    expect(stats.grazers).toBe(0);
    expect(stats.hunters).toBe(1);
    expect(stats.deaths).toBe(1);
    expect(next.generation).toBe(1);
  });

  it('allows a well-fed, fertile grazer to reproduce and passes bounded genes to offspring', () => {
    const base = createEcosystemWorld(123, 32, 20, 1, 0);
    const organisms = base.organisms.map((animal) => ({
      ...animal,
      energy: 130,
      age: 30,
      genome: { metabolism: 0.45, vision: 5, fertility: 0.065 },
    }));
    let world: EcosystemWorld = {
      ...base,
      food: new Uint8Array(base.food.length).fill(3),
      organisms,
      rules: {
        ...base.rules,
        foodRegrowth: 0.08,
        metabolism: 0.4,
        reproductionThreshold: 35,
        mutationRate: 0.25,
      },
    };
    for (let generation = 0; generation < 80 && world.births === 0; generation++) {
      world = stepEcosystem(world);
    }
    expect(world.births).toBeGreaterThan(0);
    expect(world.organisms.length).toBeGreaterThan(1);
    for (const animal of world.organisms) {
      expect(animal.genome.metabolism).toBeGreaterThanOrEqual(0.45);
      expect(animal.genome.metabolism).toBeLessThanOrEqual(1.6);
      expect(animal.genome.vision).toBeGreaterThanOrEqual(2);
      expect(animal.genome.vision).toBeLessThanOrEqual(10);
      expect(animal.genome.fertility).toBeGreaterThanOrEqual(0.008);
      expect(animal.genome.fertility).toBeLessThanOrEqual(0.065);
    }
  });

  it('keeps every organism inside the world without overlapping cells over many generations', () => {
    let world = createEcosystemWorld(2026, 42, 24, 32, 8);
    for (let generation = 0; generation < 100; generation++) {
      world = stepEcosystem(world);
      const occupied = world.organisms.map((animal) => animal.y * world.width + animal.x);
      expect(new Set(occupied).size).toBe(occupied.length);
      for (const animal of world.organisms) {
        expect(animal.x).toBeGreaterThanOrEqual(0);
        expect(animal.x).toBeLessThan(world.width);
        expect(animal.y).toBeGreaterThanOrEqual(0);
        expect(animal.y).toBeLessThan(world.height);
      }
    }
  });

  it('round-trips world state, genomes, counters and editable ecological rules', () => {
    let world = createEcosystemWorld(77, 36, 22, 18, 4);
    for (let generation = 0; generation < 12; generation++) world = stepEcosystem(world);
    world = {
      ...world,
      rules: {
        foodRegrowth: 0.031,
        metabolism: 1.35,
        mutationRate: 0.12,
        reproductionThreshold: 76,
        predationEnergy: 48,
      },
    };
    const restored = deserializeEcosystem(serializeEcosystem(world));
    expect(restored).not.toBeNull();
    expect(restored?.food).toEqual(world.food);
    expect(restored?.organisms).toEqual(world.organisms);
    expect(restored?.generation).toBe(world.generation);
    expect(restored?.rngState).toBe(world.rngState);
    expect(restored?.rules).toEqual(world.rules);
    expect(restored?.births).toBe(world.births);
    expect(restored?.deaths).toBe(world.deaths);
  });

  it('rejects malformed, oversized, overlapping and out-of-range snapshots', () => {
    const world = createEcosystemWorld(8, 24, 16, 2, 1);
    const valid = JSON.parse(serializeEcosystem(world)) as Record<string, unknown>;
    expect(deserializeEcosystem('not-json')).toBeNull();
    expect(deserializeEcosystem('x'.repeat(240_001))).toBeNull();

    const invalidFood = { ...valid, food: '9' + String(valid.food).slice(1) };
    expect(deserializeEcosystem(JSON.stringify(invalidFood))).toBeNull();

    const duplicate = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
    const duplicateAnimals = duplicate.organisms as Array<Record<string, unknown>>;
    duplicateAnimals[1] = { ...duplicateAnimals[1], x: duplicateAnimals[0].x, y: duplicateAnimals[0].y };
    expect(deserializeEcosystem(JSON.stringify(duplicate))).toBeNull();

    const invalidRules = { ...valid, rules: { ...world.rules, mutationRate: 2 } };
    expect(deserializeEcosystem(JSON.stringify(invalidRules))).toBeNull();
  });

  it('reports population, species, food and genome statistics without division errors', () => {
    const world = createEcosystemWorld(90, 24, 16, 6, 2);
    const stats = getEcosystemStats(world);
    expect(stats.population).toBe(8);
    expect(stats.grazers).toBe(6);
    expect(stats.hunters).toBe(2);
    expect(stats.foodCells).toBeGreaterThan(0);
    expect(stats.foodUnits).toBeGreaterThanOrEqual(stats.foodCells);
    expect(stats.averageEnergy).toBeGreaterThan(0);
    expect(stats.predatorPreyRatio).toBeCloseTo(2 / 6);
  });

  it('handles a world with no organisms and exposes an empty-population safe ratio', () => {
    const world = createEcosystemWorld(91, 24, 16, 0, 0);
    const stats = getEcosystemStats(world);
    expect(stats.population).toBe(0);
    expect(stats.averageEnergy).toBe(0);
    expect(stats.averageMetabolism).toBe(0);
    expect(stats.predatorPreyRatio).toBe(0);
    expect(stepEcosystem(world).generation).toBe(1);
  });
});
