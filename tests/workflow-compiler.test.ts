import { describe, expect, it } from 'vitest';
import { compileWorkflowGraph } from '@/lib/workflows/compiler';

const node = (id: string, type: string = 'action', title = id) => ({ id, type, title });

describe('workflow graph compiler', () => {
  it('compiles a legacy node list in stable array order with a migration warning', () => {
    const result = compileWorkflowGraph([
      node('start', 'trigger', 'Start'),
      node('condition', 'condition', 'Check'),
      node('action', 'action', 'Do'),
    ], []);

    expect(result.valid).toBe(true);
    expect(result.mode).toBe('legacy-linear');
    expect(result.order.map((item) => item.id)).toEqual(['start', 'condition', 'action']);
    expect(result.warnings.join(' ')).toContain('không có edges');
  });

  it('compiles a DAG using stable topological ordering rather than node-array guesswork', () => {
    const result = compileWorkflowGraph([
      node('trigger', 'trigger', 'Start'),
      node('second', 'action', 'Second branch'),
      node('first', 'condition', 'First branch'),
      node('merge', 'action', 'Merge'),
    ], [
      { id: 'a', source: 'trigger', target: 'second' },
      { id: 'b', source: 'trigger', target: 'first' },
      { id: 'c', source: 'second', target: 'merge' },
      { id: 'd', source: 'first', target: 'merge' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.mode).toBe('dag');
    expect(result.order.map((item) => item.id)).toEqual(['trigger', 'second', 'first', 'merge']);
    expect(result.errors).toEqual([]);
  });

  it('rejects cycles', () => {
    const result = compileWorkflowGraph([
      node('start', 'trigger'),
      node('a'),
      node('b'),
    ], [
      { source: 'start', target: 'a' },
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('chu trình');
  });

  it('rejects dangling and self-referencing edges', () => {
    const dangling = compileWorkflowGraph([node('start', 'trigger'), node('a')], [
      { source: 'start', target: 'missing' },
    ]);
    expect(dangling.valid).toBe(false);
    expect(dangling.errors.join(' ')).toContain('node không tồn tại');

    const self = compileWorkflowGraph([node('start', 'trigger')], [
      { source: 'start', target: 'start' },
    ]);
    expect(self.valid).toBe(false);
    expect(self.errors.join(' ')).toContain('chính nó');
  });

  it('rejects nodes unreachable from the trigger', () => {
    const result = compileWorkflowGraph([
      node('start', 'trigger'),
      node('reachable'),
      node('orphan'),
    ], [{ source: 'start', target: 'reachable' }]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('orphan');
  });

  it('requires exactly one root trigger', () => {
    const noTrigger = compileWorkflowGraph([node('a'), node('b')], []);
    expect(noTrigger.valid).toBe(false);
    expect(noTrigger.errors.join(' ')).toContain('đúng một node trigger');

    const twoTriggers = compileWorkflowGraph([
      node('start', 'trigger'),
      node('also-start', 'trigger'),
    ], []);
    expect(twoTriggers.valid).toBe(false);
  });

  it('rejects duplicate node IDs and duplicate directed edges', () => {
    const duplicateNode = compileWorkflowGraph([
      node('start', 'trigger'),
      node('start'),
    ], []);
    expect(duplicateNode.valid).toBe(false);
    expect(duplicateNode.errors.join(' ')).toContain('ID node bị trùng');

    const duplicateEdge = compileWorkflowGraph([
      node('start', 'trigger'),
      node('a'),
    ], [
      { source: 'start', target: 'a' },
      { source: 'start', target: 'a' },
    ]);
    expect(duplicateEdge.valid).toBe(false);
    expect(duplicateEdge.errors.join(' ')).toContain('Cạnh trùng lặp');
  });

  it('rejects malformed node config, position and unsupported types', () => {
    const badConfig = compileWorkflowGraph([
      node('start', 'trigger'),
      { ...node('a'), config: 'run shell' },
    ], []);
    expect(badConfig.valid).toBe(false);
    expect(badConfig.errors.join(' ')).toContain('config phải là object');

    const badPosition = compileWorkflowGraph([
      node('start', 'trigger'),
      { ...node('a'), position: { x: Number.NaN, y: 0 } },
    ], []);
    expect(badPosition.valid).toBe(false);
    expect(badPosition.errors.join(' ')).toContain('position không hợp lệ');

    const badType = compileWorkflowGraph([
      node('start', 'trigger'),
      node('a', 'run-code'),
    ], []);
    expect(badType.valid).toBe(false);
    expect(badType.errors.join(' ')).toContain('type không được hỗ trợ');
  });

  it('enforces node and edge count limits', () => {
    const tooManyNodes = compileWorkflowGraph(
      Array.from({ length: 101 }, (_, index) => node(`n-${index}`, index === 0 ? 'trigger' : 'action')),
      [],
    );
    expect(tooManyNodes.valid).toBe(false);
    expect(tooManyNodes.errors.join(' ')).toContain('100 node');

    const tooManyEdges = compileWorkflowGraph([node('start', 'trigger')], Array.from({ length: 301 }, (_, index) => ({
      source: 'start',
      target: 'start',
      id: String(index),
    })));
    expect(tooManyEdges.valid).toBe(false);
    expect(tooManyEdges.errors.join(' ')).toContain('300 cạnh');
  });

  it('treats an empty graph as compatible but explicitly warns there are no node steps', () => {
    const result = compileWorkflowGraph([], []);
    expect(result.valid).toBe(true);
    expect(result.mode).toBe('empty');
    expect(result.order).toEqual([]);
    expect(result.warnings.join(' ')).toContain('chưa có node');
  });
});
