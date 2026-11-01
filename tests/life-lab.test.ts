import { describe, expect, it } from 'vitest';
import {
  clearSimulation,
  createEmptySimulation,
  createSimulation,
  deserializeSimulation,
  getSimulationStats,
  paintSimulation,
  randomizeSimulation,
  serializeSimulation,
  stepSimulation,
} from '@/lib/life-lab/simulation';

function setCells(
  state: ReturnType<typeof createEmptySimulation>,
  coordinates: Array<[number, number, number]>,
) {
  const cells = new Uint8Array(state.cells);
  for (const [x, y, value] of coordinates) cells[y * state.width + x] = value;
  return { ...state, cells };
}

describe('Life Lab simulation engine', () => {
  it('creates bounded grids and starts at generation zero', () => {
    const state = createEmptySimulation('life', 999, 2);
    expect(state.width).toBe(180);
    expect(state.height).toBe(12);
    expect(state.cells).toHaveLength(2160);
    expect(state.generation).toBe(0);
  });

  it('evolves a Conway blinker and returns to its original orientation', () => {
    const initial = setCells(createEmptySimulation('life', 5, 5), [
      [2, 1, 1], [2, 2, 1], [2, 3, 1],
    ]);
    const horizontal = stepSimulation(initial);
    expect([...horizontal.cells].filter(Boolean)).toHaveLength(3);
    expect(horizontal.cells[2 * 5 + 1]).toBe(1);
    expect(horizontal.cells[2 * 5 + 2]).toBe(1);
    expect(horizontal.cells[2 * 5 + 3]).toBe(1);
    expect(stepSimulation(horizontal).cells).toEqual(initial.cells);
  });

  it("applies Brian's Brain's firing, refractory and birth states", () => {
    const initial = setCells(createEmptySimulation('brain', 5, 5), [
      [2, 1, 1], [2, 3, 1],
    ]);
    const first = stepSimulation(initial);
    expect(first.cells[2 * 5 + 2]).toBe(1);
    expect(first.cells[2 * 5 + 1]).toBe(2);
    expect(first.cells[2 * 5 + 3]).toBe(2);
    const second = stepSimulation(first);
    expect(second.cells[2 * 5 + 2]).toBe(2);
    expect(second.cells[2 * 5 + 1]).toBe(0);
  });

  it('spreads forest fire locally and clears burning cells on the next step', () => {
    const initial = setCells(createEmptySimulation('forest', 5, 5), [
      [2, 2, 2], [3, 2, 1], [4, 4, 1],
    ]);
    const burning = stepSimulation(initial, () => 0);
    expect(burning.cells[2 * 5 + 2]).toBe(0);
    expect(burning.cells[2 * 5 + 3]).toBe(2);
    expect(burning.cells[4 * 5 + 4]).toBe(1);
  });

  it("makes Langton's ant turn, flip a tile and move", () => {
    const initial = createEmptySimulation('ant', 9, 9);
    const first = stepSimulation(initial);
    expect(first.antDirection).toBe(1);
    expect(first.antX).toBe(initial.antX + 1);
    expect(first.antY).toBe(initial.antY);
    expect(first.cells[initial.antY * initial.width + initial.antX]).toBe(1);

    const second = stepSimulation(first);
    expect(second.antDirection).toBe(2);
    expect(second.antX).toBe(first.antX);
    expect(second.antY).toBe(first.antY + 1);
  });

  it('wraps the ant at world boundaries without leaving the grid', () => {
    const initial = {
      ...createEmptySimulation('ant', 8, 8),
      antX: 7,
      antY: 0,
      antDirection: 1 as const,
    };
    const next = stepSimulation(initial);
    expect(next.antX).toBe(0);
    expect(next.antY).toBe(0);
  });

  it('paints and clears cells without mutating the previous world', () => {
    const initial = createEmptySimulation('life', 20, 12);
    const painted = paintSimulation(initial, 10, 6, 2);
    expect(getSimulationStats(painted).active).toBeGreaterThan(1);
    expect(getSimulationStats(initial).active).toBe(0);
    expect(getSimulationStats(clearSimulation(painted)).active).toBe(0);
    expect(clearSimulation(painted).generation).toBe(0);
  });

  it('reports useful population and density metrics', () => {
    const state = setCells(createEmptySimulation('forest', 4, 4), [
      [0, 0, 1], [1, 0, 1], [2, 0, 2], [3, 3, 2],
    ]);
    const stats = getSimulationStats(state);
    expect(stats.total).toBe(16);
    expect(stats.states[1]).toBe(2);
    expect(stats.states[2]).toBe(2);
    expect(stats.active).toBe(4);
    expect(stats.density).toBe(0.25);
  });

  it('round-trips a world snapshot and rejects malformed or oversized data', () => {
    const state = stepSimulation(createSimulation('brain', 32, 18, () => 0.1));
    const restored = deserializeSimulation(serializeSimulation(state));
    expect(restored).not.toBeNull();
    expect(restored?.mode).toBe('brain');
    expect(restored?.generation).toBe(state.generation);
    expect(restored?.cells).toEqual(state.cells);
    expect(deserializeSimulation('not-json')).toBeNull();
    expect(deserializeSimulation('x'.repeat(40_001))).toBeNull();
  });

  it('rejects cell values that do not belong to the selected simulation mode', () => {
    const state = createEmptySimulation('life', 12, 12);
    const snapshot = JSON.parse(serializeSimulation(state)) as Record<string, unknown>;
    snapshot.cells = '2' + String(snapshot.cells).slice(1);
    expect(deserializeSimulation(JSON.stringify(snapshot))).toBeNull();
  });

  it('randomizes deterministically when supplied with a deterministic random source', () => {
    const initial = createEmptySimulation('life', 20, 12);
    const randomized = randomizeSimulation(initial, () => 0);
    expect(getSimulationStats(randomized).active).toBe(240);
    expect(randomized.generation).toBe(0);
  });
});
