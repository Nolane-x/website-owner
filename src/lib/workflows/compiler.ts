export type WorkflowGraphMode = 'empty' | 'legacy-linear' | 'dag';

export interface CompiledWorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'ai' | 'approval';
  title: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowCompilation {
  valid: boolean;
  mode: WorkflowGraphMode;
  nodeCount: number;
  edgeCount: number;
  order: CompiledWorkflowNode[];
  errors: string[];
  warnings: string[];
}

const NODE_TYPES = new Set(['trigger', 'condition', 'action', 'ai', 'approval']);
const MAX_NODES = 100;
const MAX_EDGES = 300;
const MAX_ID_LENGTH = 120;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate and compile a stored workflow graph without executing it.
 *
 * Legacy definitions with nodes but no edges are interpreted as an explicit
 * linear sequence in array order. Definitions that provide edges must form a
 * connected DAG rooted at exactly one trigger. Sorting is stable with respect
 * to the stored node order so repeated compilations produce identical plans.
 */
export function compileWorkflowGraph(nodesValue: unknown, edgesValue: unknown): WorkflowCompilation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodesInput = nodesValue === undefined || nodesValue === null ? [] : nodesValue;
  const edgesInput = edgesValue === undefined || edgesValue === null ? [] : edgesValue;

  if (!Array.isArray(nodesInput)) {
    return { valid: false, mode: 'empty', nodeCount: 0, edgeCount: 0, order: [], errors: ['nodes phải là một mảng.'], warnings };
  }
  if (!Array.isArray(edgesInput)) {
    return { valid: false, mode: 'empty', nodeCount: nodesInput.length, edgeCount: 0, order: [], errors: ['edges phải là một mảng.'], warnings };
  }
  if (nodesInput.length > MAX_NODES) errors.push(`Workflow vượt giới hạn ${MAX_NODES} node.`);
  if (edgesInput.length > MAX_EDGES) errors.push(`Workflow vượt giới hạn ${MAX_EDGES} cạnh.`);
  if (errors.length) {
    return { valid: false, mode: edgesInput.length ? 'dag' : 'legacy-linear', nodeCount: nodesInput.length, edgeCount: edgesInput.length, order: [], errors, warnings };
  }

  if (nodesInput.length === 0) {
    if (edgesInput.length > 0) errors.push('Workflow không thể có cạnh khi không có node.');
    else warnings.push('Workflow chưa có node; chỉ executor theo triggerType hiện có mới có thể chạy, không có đồ thị để thực thi.');
    return { valid: errors.length === 0, mode: 'empty', nodeCount: 0, edgeCount: 0, order: [], errors, warnings };
  }

  const nodes: CompiledWorkflowNode[] = [];
  const indexById = new Map<string, number>();
  for (let index = 0; index < nodesInput.length; index++) {
    const raw = nodesInput[index];
    if (!isRecord(raw)) {
      errors.push(`Node #${index + 1} phải là một object.`);
      continue;
    }

    const id = raw.id;
    const type = raw.type;
    const title = raw.title;
    if (typeof id !== 'string' || !id.trim() || id.length > MAX_ID_LENGTH) {
      errors.push(`Node #${index + 1} có ID không hợp lệ.`);
      continue;
    }
    if (indexById.has(id)) {
      errors.push(`ID node bị trùng: ${id}.`);
      continue;
    }
    if (typeof type !== 'string' || !NODE_TYPES.has(type)) {
      errors.push(`Node ${id} có type không được hỗ trợ.`);
      continue;
    }
    if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE_LENGTH) {
      errors.push(`Node ${id} phải có title từ 1 đến ${MAX_TITLE_LENGTH} ký tự.`);
      continue;
    }
    if (raw.description !== undefined && raw.description !== null &&
        (typeof raw.description !== 'string' || raw.description.length > MAX_DESCRIPTION_LENGTH)) {
      errors.push(`Node ${id} có description không hợp lệ.`);
      continue;
    }
    if (raw.config !== undefined && !isRecord(raw.config)) {
      errors.push(`Node ${id} có config phải là object.`);
      continue;
    }
    if (raw.position !== undefined) {
      if (!isRecord(raw.position) ||
          typeof raw.position.x !== 'number' || !Number.isFinite(raw.position.x) ||
          typeof raw.position.y !== 'number' || !Number.isFinite(raw.position.y)) {
        errors.push(`Node ${id} có position không hợp lệ.`);
        continue;
      }
    }

    indexById.set(id, index);
    nodes.push({
      id,
      type: type as CompiledWorkflowNode['type'],
      title: title.trim(),
      ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
      ...(isRecord(raw.config) ? { config: raw.config } : {}),
    });
  }

  if (nodes.length !== nodesInput.length) {
    return {
      valid: false,
      mode: edgesInput.length ? 'dag' : 'legacy-linear',
      nodeCount: nodesInput.length,
      edgeCount: edgesInput.length,
      order: [],
      errors: errors.length ? errors : ['Workflow có node không hợp lệ.'],
      warnings,
    };
  }

  const triggers = nodes.filter((node) => node.type === 'trigger');
  if (triggers.length !== 1) errors.push('Workflow phải có đúng một node trigger.');
  if (errors.length) {
    return { valid: false, mode: edgesInput.length ? 'dag' : 'legacy-linear', nodeCount: nodes.length, edgeCount: edgesInput.length, order: [], errors, warnings };
  }
  const trigger = triggers[0];

  if (edgesInput.length === 0) {
    if (nodes[0]?.id !== trigger.id) {
      errors.push('Ở chế độ tuyến tính cũ, node trigger phải đứng đầu danh sách.');
    }
    if (nodes.length > 1) {
      warnings.push('Định nghĩa cũ không có edges; thứ tự trong danh sách được dùng làm thứ tự biên dịch.');
    }
    return {
      valid: errors.length === 0,
      mode: 'legacy-linear',
      nodeCount: nodes.length,
      edgeCount: 0,
      order: errors.length ? [] : nodes,
      errors,
      warnings,
    };
  }

  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  const edgePairs = new Set<string>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
    indegree.set(node.id, 0);
  }

  for (let index = 0; index < edgesInput.length; index++) {
    const raw = edgesInput[index];
    if (!isRecord(raw) || typeof raw.source !== 'string' || typeof raw.target !== 'string') {
      errors.push(`Cạnh #${index + 1} phải có source và target dạng chuỗi.`);
      continue;
    }
    if (!indexById.has(raw.source) || !indexById.has(raw.target)) {
      errors.push(`Cạnh #${index + 1} tham chiếu node không tồn tại.`);
      continue;
    }
    if (raw.source === raw.target) {
      errors.push(`Cạnh #${index + 1} không được nối node với chính nó.`);
      continue;
    }
    if (raw.id !== undefined && (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > MAX_ID_LENGTH)) {
      errors.push(`Cạnh #${index + 1} có ID không hợp lệ.`);
      continue;
    }
    if (raw.label !== undefined && (typeof raw.label !== 'string' || raw.label.length > 120)) {
      errors.push(`Cạnh #${index + 1} có label không hợp lệ.`);
      continue;
    }

    const pair = `${raw.source}\u0000${raw.target}`;
    if (edgePairs.has(pair)) {
      errors.push(`Cạnh trùng lặp: ${raw.source} → ${raw.target}.`);
      continue;
    }
    edgePairs.add(pair);
    adjacency.get(raw.source)!.push(raw.target);
    indegree.set(raw.target, (indegree.get(raw.target) ?? 0) + 1);
  }

  if ((indegree.get(trigger.id) ?? 0) !== 0) {
    errors.push('Node trigger không được có cạnh đi vào.');
  }

  const ready = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => indexById.get(a.id)! - indexById.get(b.id)!);
  const sorted: CompiledWorkflowNode[] = [];
  const remainingIndegree = new Map(indegree);

  while (ready.length > 0) {
    const current = ready.shift()!;
    sorted.push(current);
    for (const targetId of adjacency.get(current.id) ?? []) {
      const nextDegree = (remainingIndegree.get(targetId) ?? 0) - 1;
      remainingIndegree.set(targetId, nextDegree);
      if (nextDegree === 0) {
        ready.push(nodes[indexById.get(targetId)!]);
        ready.sort((a, b) => indexById.get(a.id)! - indexById.get(b.id)!);
      }
    }
  }

  if (sorted.length !== nodes.length) errors.push('Workflow chứa chu trình; không thể biên dịch đồ thị có hướng không chu trình (DAG).');

  const reachable = new Set<string>();
  const stack = [trigger.id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  const unreachable = nodes.filter((node) => !reachable.has(node.id));
  if (unreachable.length) errors.push(`Node không thể đi tới từ trigger: ${unreachable.map((node) => node.id).join(', ')}.`);

  return {
    valid: errors.length === 0,
    mode: 'dag',
    nodeCount: nodes.length,
    edgeCount: edgesInput.length,
    order: errors.length ? [] : sorted,
    errors,
    warnings,
  };
}
