'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GitBranch, Play, CheckCircle2, AlertTriangle, Plus, RefreshCw, Inbox as InboxIcon, ShieldCheck } from 'lucide-react';
import type { InboxItem } from '@/lib/types';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'ai' | 'approval';
  title: string;
  description: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  nodesJson: WorkflowNode[];
  edgesJson: unknown[];
  isActive: boolean;
  scheduleEnabled: boolean;
  lastScheduledFor?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskSummary {
  id: string;
  title: string;
  dueDate?: string | null;
  status: string;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  triggerType: string;
  status: string;
  inputJson: Record<string, unknown>;
  resultJson: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface RunResult {
  status: string;
  runId?: string;
  result?: string;
  error?: string;
  totalTasks?: number;
  overdueCount?: number;
  overdueTasks?: TaskSummary[];
  task?: { id: string; title: string };
  idempotentReplay?: boolean;
  sideEffects?: boolean;
}

const TEMPLATES: Array<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Universal Inbox → Kanban Task',
    description: 'Chuyển một mục Inbox thành task thật, giữ liên kết nguồn và có thể chạy lại mà không tạo task trùng.',
    triggerType: 'inbox_to_task',
    isActive: true,
    scheduleEnabled: false,
    edgesJson: [],
    nodesJson: [
      { id: 'capture', type: 'trigger', title: 'Chọn mục Inbox', description: 'Đọc mục do chủ sở hữu chọn trong Inbox.' },
      { id: 'dedupe', type: 'condition', title: 'Kiểm tra task liên kết', description: 'Tái sử dụng task đã có nếu cùng nguồn đã được chuyển trước đó.' },
      { id: 'create', type: 'action', title: 'Tạo hoặc tái sử dụng task', description: 'Lưu task vào database với relatedItemId trỏ về Inbox.' },
      { id: 'convert', type: 'action', title: 'Cập nhật trạng thái Inbox', description: 'Đánh dấu converted sau khi đã xác minh task.' },
    ],
  },
  {
    name: 'Overdue Task Audit',
    description: 'Đọc task thật, tính các deadline đã qua và xuất báo cáo. Quy trình này chỉ đọc, không thay đổi dữ liệu.',
    triggerType: 'overdue_report',
    isActive: true,
    scheduleEnabled: false,
    edgesJson: [],
    nodesJson: [
      { id: 'load', type: 'trigger', title: 'Đọc danh sách task', description: 'Truy vấn task thuộc chủ sở hữu hiện tại.' },
      { id: 'check', type: 'condition', title: 'Kiểm tra deadline', description: 'Bỏ qua task đã hoàn thành hoặc chưa có deadline.' },
      { id: 'report', type: 'action', title: 'Tạo báo cáo kiểm tra', description: 'Hiển thị số task quá hạn và danh sách chi tiết.' },
    ],
  },
];

function triggerLabel(triggerType: string): string {
  if (triggerType === 'inbox_to_task') return 'Chuyển Inbox → Task';
  if (triggerType === 'overdue_report') return 'Kiểm tra quá hạn';
  return `Chưa có executor: ${triggerType}`;
}

export function WorkflowsApp() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [selectedInboxId, setSelectedInboxId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows],
  );
  const openInbox = useMemo(() => inboxItems.filter((item) => item.status === 'inbox'), [inboxItems]);
  const selectedRuns = useMemo(
    () => runs.filter((run) => run.workflowId === selectedWorkflowId).slice(0, 8),
    [runs, selectedWorkflowId],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflowResponse, inboxResponse, taskResponse, runsResponse] = await Promise.all([
        fetch('/api/admin/workflows', { cache: 'no-store' }),
        fetch('/api/admin/inbox', { cache: 'no-store' }),
        fetch('/api/admin/tasks', { cache: 'no-store' }),
        fetch('/api/admin/workflows/runs?limit=30', { cache: 'no-store' }),
      ]);
      const [workflowPayload, inboxPayload, taskPayload, runsPayload] = await Promise.all([
        workflowResponse.json(),
        inboxResponse.json(),
        taskResponse.json(),
        runsResponse.json(),
      ]);
      if (!workflowResponse.ok) throw new Error(workflowPayload.error || 'Không tải được workflow.');
      if (!inboxResponse.ok) throw new Error(inboxPayload.error || 'Không tải được Inbox.');
      if (!taskResponse.ok) throw new Error(taskPayload.error || 'Không tải được danh sách task.');
      if (!runsResponse.ok) throw new Error(runsPayload.error || 'Không tải được lịch sử chạy workflow.');

      const nextWorkflows = (workflowPayload.workflows || []) as Workflow[];
      setWorkflows(nextWorkflows);
      setInboxItems((inboxPayload.items || []) as InboxItem[]);
      setTasks((taskPayload.tasks || []) as TaskSummary[]);
      setRuns((Array.isArray(runsPayload.runs) ? runsPayload.runs : []) as WorkflowRun[]);
      setSelectedWorkflowId((current) => nextWorkflows.some((workflow) => workflow.id === current) ? current : (nextWorkflows[0]?.id || ''));
      setSelectedInboxId((current) => {
        const nextInbox = (inboxPayload.items || []) as InboxItem[];
        return nextInbox.some((item) => item.id === current && item.status === 'inbox') ? current : (nextInbox.find((item) => item.status === 'inbox')?.id || '');
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu workflow.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void loadData(); });
  }, [loadData]);

  const createTemplates = async () => {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      for (const template of TEMPLATES) {
        if (workflows.some((workflow) => workflow.triggerType === template.triggerType)) continue;
        const response = await fetch('/api/admin/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: template.name,
            description: template.description,
            triggerType: template.triggerType,
            nodes: template.nodesJson,
            edges: template.edgesJson,
            isActive: true,
            scheduleEnabled: template.scheduleEnabled,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Không thể lưu workflow “${template.name}”.`);
      }
      await loadData();
      setNotice('Đã lưu mẫu workflow vào database. Hai workflow này thực hiện các thao tác đọc/ghi thật ở các bước được hỗ trợ.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tạo workflow mẫu.');
    } finally {
      setCreating(false);
    }
  };

  const toggleWorkflow = async () => {
    if (!selectedWorkflow) return;
    setError(null);
    setNotice(null);
    const response = await fetch('/api/admin/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedWorkflow.id,
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        triggerType: selectedWorkflow.triggerType,
        nodes: selectedWorkflow.nodesJson,
        edges: selectedWorkflow.edgesJson,
        isActive: !selectedWorkflow.isActive,
        scheduleEnabled: selectedWorkflow.scheduleEnabled,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || 'Không thể cập nhật trạng thái workflow.');
      return;
    }
    await loadData();
    setNotice(!selectedWorkflow.isActive ? 'Đã bật workflow.' : 'Đã tắt workflow. Workflow đã tắt không thể chạy.');
  };

  const toggleSchedule = async () => {
    if (!selectedWorkflow || selectedWorkflow.triggerType !== 'overdue_report') return;
    if (!selectedWorkflow.isActive && !selectedWorkflow.scheduleEnabled) {
      setError('Hãy bật workflow trước khi bật lịch chạy tự động.');
      return;
    }

    const nextScheduleEnabled = !selectedWorkflow.scheduleEnabled;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedWorkflow.id,
          name: selectedWorkflow.name,
          description: selectedWorkflow.description,
          triggerType: selectedWorkflow.triggerType,
          nodes: selectedWorkflow.nodesJson,
          edges: selectedWorkflow.edgesJson,
          isActive: selectedWorkflow.isActive,
          scheduleEnabled: nextScheduleEnabled,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không thể cập nhật lịch workflow.');
      await loadData();
      setNotice(nextScheduleEnabled
        ? 'Đã bật lịch báo cáo chỉ đọc hằng ngày. Hãy bảo đảm CRON_SECRET đã được cấu hình trong Vercel Production.'
        : 'Đã tắt lịch chạy tự động; chạy thủ công vẫn khả dụng.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật lịch workflow.');
    }
  };

  const runWorkflow = async () => {
    if (!selectedWorkflow) return;
    if (selectedWorkflow.triggerType === 'inbox_to_task' && !selectedInboxId) {
      setError('Hãy chọn một mục Inbox đang chờ xử lý.');
      return;
    }
    setRunning(true);
    setError(null);
    setNotice(null);
    setRunResult(null);
    try {
      const response = await fetch('/api/admin/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: selectedWorkflow.id, inboxItemId: selectedWorkflow.triggerType === 'inbox_to_task' ? selectedInboxId : undefined }),
      });
      const payload = await response.json() as RunResult;
      if (!response.ok || payload.status !== 'succeeded') {
        // Non-success executions are persisted too (failed / unsupported trigger); refresh before surfacing the error.
        await loadData();
        throw new Error(payload.error || 'Workflow không hoàn tất. Không được ghi nhận là thành công.');
      }
      setRunResult(payload);
      setNotice(payload.result || 'Workflow đã chạy và trả về kết quả.');
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Workflow thất bại.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl"><GitBranch className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white">Workflow Runtime</h1>
            <p className="text-xs text-stone-400">Workflow được lưu thật; chỉ các trigger có executor mới chạy được.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => void loadData()} disabled={loading} title="Làm mới dữ liệu" className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => void createTemplates()} disabled={creating || loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"><Plus className="w-4 h-4" />{creating ? 'Đang lưu...' : 'Thêm workflow mẫu'}</button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="w-72 max-w-[42%] shrink-0 border-r border-stone-800 bg-stone-900/30 p-3 overflow-y-auto space-y-2">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">Workflow đã lưu ({workflows.length})</div>
          {loading && <div className="p-3 text-stone-500 text-xs">Đang tải...</div>}
          {!loading && workflows.length === 0 && <div className="p-3 rounded-lg border border-dashed border-stone-700 text-xs text-stone-400">Chưa có workflow nào được lưu. Nhấn “Thêm workflow mẫu” để tạo quy trình có executor thực tế.</div>}
          {workflows.map((workflow) => (
            <button key={workflow.id} onClick={() => { setSelectedWorkflowId(workflow.id); setRunResult(null); setNotice(null); }} className={`w-full text-left p-3 rounded-xl border transition ${selectedWorkflowId === workflow.id ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-stone-900/70 border-stone-800 hover:border-stone-700'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-stone-100">{workflow.name}</span>
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${workflow.isActive ? 'bg-emerald-400' : 'bg-stone-600'}`} />
              </div>
              <p className="mt-1 text-[10px] text-stone-500">{triggerLabel(workflow.triggerType)}</p>
              <p className="mt-1 text-[11px] text-stone-400 line-clamp-2">{workflow.description}</p>
            </button>
          ))}
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
          {error && <div role="alert" className="p-3 rounded-xl border border-rose-700/60 bg-rose-950/30 text-rose-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
          {notice && <div role="status" className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/20 text-emerald-200 text-xs flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{notice}</div>}

          {selectedWorkflow ? (
            <>
              <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-300">{triggerLabel(selectedWorkflow.triggerType)}</div>
                    <h2 className="text-lg font-bold text-white mt-1">{selectedWorkflow.name}</h2>
                    <p className="text-xs text-stone-400 mt-1 max-w-2xl">{selectedWorkflow.description}</p>
                    <p className="text-[10px] text-stone-500 mt-1">Ảnh chụp danh sách: {tasks.length} task. Executor sẽ kiểm tra lại dữ liệu tại thời điểm chạy.</p>
                  </div>
                  <span className={`text-[10px] rounded-full px-2 py-1 ${selectedWorkflow.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-stone-800 text-stone-400'}`}>{selectedWorkflow.isActive ? 'Đang bật' : 'Đã tắt'}</span>
                </div>
                {selectedWorkflow.triggerType === 'inbox_to_task' && (
                  <label className="block space-y-1.5">
                    <span className="text-[11px] text-stone-400">Mục Inbox cần chuyển</span>
                    <select value={selectedInboxId} onChange={(event) => setSelectedInboxId(event.target.value)} className="w-full max-w-2xl bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200">
                      <option value="">-- Chọn mục Inbox --</option>
                      {openInbox.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                    </select>
                    <span className="block text-[10px] text-stone-500">{openInbox.length} mục đang chờ. Chạy lại cùng mục sẽ tái sử dụng task đã tạo, không chủ động tạo bản trùng thứ hai.</span>
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void runWorkflow()} disabled={running || loading || !selectedWorkflow.isActive || (selectedWorkflow.triggerType === 'inbox_to_task' && !selectedInboxId) || !['inbox_to_task','overdue_report'].includes(selectedWorkflow.triggerType)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40"><Play className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />{running ? 'Đang thực thi...' : 'Chạy workflow thật'}</button>
                  <button onClick={() => void toggleWorkflow()} disabled={loading || running} className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs">{selectedWorkflow.isActive ? 'Tắt workflow' : 'Bật workflow'}</button>
                </div>
                {!['inbox_to_task','overdue_report'].includes(selectedWorkflow.triggerType) && <p className="text-[11px] text-amber-200">Executor cho trigger này chưa được triển khai. Nút chạy bị khóa; hệ thống không giả vờ thực thi.</p>}
                {selectedWorkflow.triggerType === 'overdue_report' && (
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-semibold text-stone-100">Lịch chạy tự động</h3>
                        <p className="text-[11px] text-stone-400 mt-1">Mỗi ngày, mốc 07:00 giờ Việt Nam (00:00 UTC). Chỉ đọc task và ghi kết quả vào lịch sử; không sửa task, không gọi AI và không gửi dữ liệu sang dịch vụ khác.</p>
                        <p className="text-[10px] text-stone-500 mt-1">Vercel Cron cần biến Production CRON_SECRET dài tối thiểu 16 ký tự. Độ chính xác thời điểm thực thi còn phụ thuộc gói Vercel.</p>
                      </div>
                      <button
                        onClick={() => void toggleSchedule()}
                        disabled={loading || running || (!selectedWorkflow.isActive && !selectedWorkflow.scheduleEnabled)}
                        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 ${selectedWorkflow.scheduleEnabled ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-700/60' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`}
                      >
                        {selectedWorkflow.scheduleEnabled ? 'Tắt lịch hằng ngày' : 'Bật lịch hằng ngày'}
                      </button>
                    </div>
                    <p className={`text-[10px] ${selectedWorkflow.scheduleEnabled ? 'text-emerald-300' : 'text-stone-500'}`}>
                      {selectedWorkflow.scheduleEnabled
                        ? `Đang bật · lần gần nhất đã claim: ${selectedWorkflow.lastScheduledFor || 'chưa chạy'}`
                        : 'Đang tắt · workflow chỉ chạy khi bạn bấm nút thủ công.'}
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Các bước của workflow</h3>
                  <span className="text-[10px] text-stone-500">{selectedWorkflow.nodesJson?.length || 0} bước</span>
                </div>
                <div className="space-y-2">
                  {(selectedWorkflow.nodesJson || []).map((node, index) => (
                    <div key={node.id} className="flex gap-3 p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold">{index + 1}</div>
                        {index < (selectedWorkflow.nodesJson?.length || 0) - 1 && <div className="w-px flex-1 min-h-3 bg-stone-700" />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <div className="text-xs font-semibold text-stone-100">{node.title}</div>
                        <p className="text-[11px] text-stone-400 mt-1">{node.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {runResult && (
                <section className="rounded-2xl border border-emerald-800/70 bg-emerald-950/15 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 text-sm font-bold"><CheckCircle2 className="w-4 h-4" />Kết quả đã xác nhận từ API</div>
                  <p className="text-xs text-stone-200">{runResult.result}</p>
                  {runResult.task && <div className="text-xs text-stone-300">Task: <span className="font-mono">{runResult.task.id}</span> · {runResult.task.title}</div>}
                  {typeof runResult.totalTasks === 'number' && <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-stone-950/70 p-3"><div className="text-[10px] text-stone-500">Tổng task đã đọc</div><div className="text-xl font-bold">{runResult.totalTasks}</div></div><div className="rounded-lg bg-stone-950/70 p-3"><div className="text-[10px] text-stone-500">Task quá hạn</div><div className="text-xl font-bold text-amber-300">{runResult.overdueCount}</div></div></div>}
                  {runResult.overdueTasks?.map((task) => <div key={task.id} className="flex justify-between gap-3 text-xs border-t border-stone-800 pt-2"><span>{task.title}</span><span className="text-amber-300 shrink-0">{task.dueDate}</span></div>)}
                  {runResult.idempotentReplay && <p className="text-[10px] text-sky-300">Lần chạy này tái sử dụng dữ liệu đã có, không tạo trùng.</p>}
                  {runResult.sideEffects === false && <p className="text-[10px] text-stone-500 flex gap-1"><ShieldCheck className="w-3 h-3" />Chỉ đọc; không thay đổi dữ liệu.</p>}
                </section>
              )}

              <section className="rounded-2xl border border-stone-800 bg-stone-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-300">Lịch sử chạy đã lưu</h3>
                    <p className="text-[10px] text-stone-500 mt-1">Các lượt chạy được lưu trong database, kể cả lỗi và trigger chưa hỗ trợ.</p>
                  </div>
                  <span className="text-[10px] rounded-full px-2 py-1 bg-stone-800 text-stone-400">{selectedRuns.length} gần nhất</span>
                </div>
                {selectedRuns.length === 0 && <p className="rounded-xl border border-dashed border-stone-800 p-4 text-xs text-stone-500">Workflow này chưa có lượt chạy được ghi lại.</p>}
                <div className="space-y-2">
                  {selectedRuns.map((run) => {
                    const statusLabel = run.status === 'succeeded'
                      ? 'Thành công'
                      : run.status === 'failed'
                        ? 'Thất bại'
                        : run.status === 'running'
                          ? 'Đang chạy'
                          : run.status === 'unsupported_trigger'
                            ? 'Chưa hỗ trợ'
                            : run.status === 'interrupted'
                              ? 'Gián đoạn'
                              : run.status;
                    const statusClass = run.status === 'succeeded'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-800/70'
                      : run.status === 'failed'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-800/70'
                        : run.status === 'running'
                          ? 'bg-sky-500/10 text-sky-300 border-sky-800/70'
                          : 'bg-amber-500/10 text-amber-200 border-amber-800/70';
                    const summary = typeof run.resultJson?.result === 'string'
                      ? run.resultJson.result
                      : run.errorMessage || 'Không có phần tóm tắt kết quả.';
                    return (
                      <article key={run.id} className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass}`}>{statusLabel}</span>
                          <span className="text-[10px] text-stone-500">{new Date(run.startedAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="mt-2 text-xs text-stone-200">{summary}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-500">
                          <span className="font-mono">#{run.id.slice(0, 8)}</span>
                          {typeof run.durationMs === 'number' && <span>{run.durationMs} ms</span>}
                          {run.finishedAt && <span>Hoàn tất: {new Date(run.finishedAt).toLocaleString('vi-VN')}</span>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 text-stone-500">
              <InboxIcon className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm">{loading ? 'Đang tải...' : 'Chọn workflow đã lưu hoặc tạo mẫu để bắt đầu.'}</p>
            </div>
          )}
          <div className="text-[10px] text-stone-600 border-t border-stone-900 pt-3">Lịch sử chạy được lưu trong database. Lịch nền hằng ngày hiện chỉ hỗ trợ báo cáo task quá hạn dạng chỉ đọc; trigger khác vẫn cần executor riêng và không được giả vờ thành công.</div>
        </main>
      </div>
    </div>
  );
}
