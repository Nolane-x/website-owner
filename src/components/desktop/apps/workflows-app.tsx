'use client';

import React, { useState } from 'react';
import { GitBranch, Play, CheckCircle, Zap, ArrowRight, Terminal } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'ai' | 'approval';
  title: string;
  description: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  nodes: WorkflowNode[];
  isActive: boolean;
}

// Mẫu workflow có sẵn theo Section 34.4 (Deadline -> Nhắc việc & AI phân loại)
const defaultWorkflows: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Thu nhận Thông minh: Inbox → Phân loại AI → Tạo Task',
    description: 'Tự động kích hoạt khi có item mới vào Universal Inbox, gọi AI trích xuất hạn chót và thêm vào Kanban',
    triggerType: 'inbox_created',
    isActive: true,
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Khi có Item vào Inbox', description: 'Bắt sự kiện Universal Inbox mới' },
      { id: 'n2', type: 'ai', title: 'AI Trích xuất & Phân loại', description: 'Phân tích tiêu đề và độ khẩn cấp' },
      { id: 'n3', type: 'condition', title: 'Kiểm tra Có hạn chót?', description: 'Nếu phát hiện ngày hoặc giờ cụ thể' },
      { id: 'n4', type: 'action', title: 'Tạo Nhiệm vụ Kanban', description: 'Thêm thẻ việc vào cột Cần làm' },
      { id: 'n5', type: 'approval', title: 'Cổng Phê duyệt Chủ sở hữu', description: 'Chờ người dùng xác nhận trước khi lưu' },
    ],
  },
  {
    id: 'wf-2',
    name: 'Cảnh báo Tiến độ: Quá hạn → Cập nhật Sức khỏe Dự án',
    description: 'Quét các task quá hạn vào 09:00 hàng ngày và tính toán lại điểm sức khỏe Project Cockpit',
    triggerType: 'schedule_daily',
    isActive: true,
    nodes: [
      { id: 'n21', type: 'trigger', title: 'Lịch chạy hàng ngày 09:00', description: 'Bộ lập lịch tự động kích hoạt' },
      { id: 'n22', type: 'action', title: 'Quét Nhiệm vụ quá hạn', description: 'Lọc các task có dueDate < hôm nay' },
      { id: 'n23', type: 'action', title: 'Cập nhật Điểm Sức khỏe Cockpit', description: 'Áp dụng công thức trừ điểm minh bạch' },
      { id: 'n24', type: 'action', title: 'Bắn Thông báo OS', description: 'Hiển thị toast cảnh báo lên Desktop Topbar' },
    ],
  },
];

export function WorkflowsApp() {
  const [workflows] = useState<Workflow[]>(defaultWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(defaultWorkflows[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<number>(-1);

  const handleSimulateRun = async () => {
    if (!selectedWorkflow) return;
    setIsRunning(true);
    setExecutionLogs([]);
    setActiveStep(0);

    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setExecutionLogs([...logs]);
    };

    log(`Bắt đầu chạy thử nghiệm (Dry-Run): ${selectedWorkflow.name}`);

    for (let i = 0; i < selectedWorkflow.nodes.length; i++) {
      const node = selectedWorkflow.nodes[i];
      setActiveStep(i);
      log(`Đang thực thi Bước ${i + 1}: [${node.title}]...`);
      await new Promise(r => setTimeout(r, 600));

      if (node.type === 'trigger') {
        log(`✓ Trigger xác nhận hợp lệ (${selectedWorkflow.triggerType}).`);
      } else if (node.type === 'ai') {
        log(`✓ AI trích xuất hoàn tất: Tìm thấy nhãn [Độ ưu tiên: Cao].`);
      } else if (node.type === 'condition') {
        log(`✓ Điều kiện thỏa mãn: Rẽ nhánh thành công.`);
      } else if (node.type === 'action') {
        log(`✓ Thực hiện hành động: Payload đã chuẩn bị sẵn sàng.`);
      } else if (node.type === 'approval') {
        log(`⚠ Cổng phê duyệt (Human Approval Gate): Đã gửi yêu cầu xác nhận tới người điều hành.`);
      }
    }

    log(`=== Hoàn thành thử nghiệm luồng tự động hóa thành công 100% ===`);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Visual Workflow Canvas & Automation Engine</h1>
            <p className="text-xs text-stone-400">Trình thiết kế quy trình tự động hóa dạng node graph độc lập với kiểm duyệt an toàn</p>
          </div>
        </div>

        {selectedWorkflow && (
          <button
            onClick={handleSimulateRun}
            disabled={isRunning}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Đang chạy thử...' : 'Chạy thử nghiệm (Dry-Run)'}</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar workflows */}
        <div className="w-72 border-r border-stone-800 bg-stone-900/30 p-4 space-y-3 overflow-y-auto">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Quy trình đã lưu</div>
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => {
                setSelectedWorkflow(wf);
                setActiveStep(-1);
                setExecutionLogs([]);
              }}
              className={`p-3.5 rounded-xl cursor-pointer transition border ${
                selectedWorkflow?.id === wf.id
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                  : 'bg-stone-900/60 border-stone-800/80 text-stone-400 hover:bg-stone-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-200 line-clamp-1">{wf.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{wf.description}</p>
            </div>
          ))}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-stone-950 p-6 overflow-y-auto space-y-6">
          {selectedWorkflow ? (
            <>
              {/* Nodes Pipeline */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Cấu trúc Node Pipeline</div>
                <div className="flex flex-col space-y-3">
                  {selectedWorkflow.nodes.map((node, index) => {
                    const isStepActive = activeStep === index;
                    const isPassed = activeStep > index;

                    return (
                      <React.Fragment key={node.id}>
                        <div className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                          isStepActive
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/50'
                            : isPassed
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-stone-200'
                            : 'bg-stone-900 border-stone-800 text-stone-300'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl text-xs font-bold ${
                              node.type === 'trigger' ? 'bg-amber-500/20 text-amber-400' :
                              node.type === 'ai' ? 'bg-purple-500/20 text-purple-400' :
                              node.type === 'condition' ? 'bg-sky-500/20 text-sky-400' :
                              node.type === 'approval' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {node.type.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{node.title}</div>
                              <div className="text-xs text-stone-400">{node.description}</div>
                            </div>
                          </div>

                          <div>
                            {isPassed && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                            {isStepActive && <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />}
                          </div>
                        </div>

                        {index < selectedWorkflow.nodes.length - 1 && (
                          <div className="flex justify-center -my-1">
                            <ArrowRight className="w-4 h-4 text-stone-600 rotate-90" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Execution Console Logs */}
              {executionLogs.length > 0 && (
                <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-stone-300">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Nhật ký Chạy Thử nghiệm (Simulator Audit Log)</span>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl font-mono text-[11px] text-stone-300 space-y-1 max-h-48 overflow-y-auto border border-stone-800/80">
                    {executionLogs.map((l, i) => (
                      <div key={i} className="leading-relaxed">{l}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500 text-sm">
              Chọn một quy trình tự động hóa từ cột bên trái để bắt đầu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
