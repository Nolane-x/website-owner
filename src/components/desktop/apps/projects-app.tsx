'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Target, ShieldAlert, Award, Activity, Plus, FileText, RefreshCw } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  targetDate: string;
  status: string;
  progress: number;
}

interface Decision {
  id: string;
  title: string;
  context: string;
  decision: string;
  status: string;
}

interface ProjectHealth {
  score: number;
  overdueCount: number;
  blockedCount: number;
  velocity: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function ProjectsApp() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [health, setHealth] = useState<ProjectHealth>({ score: 100, overdueCount: 0, blockedCount: 0, velocity: 0, status: 'healthy' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'decisions' | 'risks'>('overview');

  // Form tạo Goal mới
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('delivery');
  const [newGoalDate, setNewGoalDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/projects/cockpit');
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
        setDecisions(data.decisions || []);
        if (data.health) setHealth(data.health);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadData();
    });
  }, [loadData]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const res = await fetch('/api/admin/projects/cockpit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoalTitle,
          category: newGoalCategory,
          targetDate: newGoalDate || new Date().toISOString().split('T')[0],
          progress: 10,
        }),
      });
      if (res.ok) {
        setNewGoalTitle('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Project Cockpit & Delivery Intelligence</h1>
            <p className="text-xs text-stone-400">Điều hành mục tiêu, nhật ký quyết định và chỉ số sức khỏe dự án minh bạch</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center px-6 border-b border-stone-800 bg-stone-900/30 text-xs">
        {[
          { id: 'overview', label: 'Tổng quan Sức khỏe', icon: Activity },
          { id: 'goals', label: `Mục tiêu (${goals.length})`, icon: Award },
          { id: 'decisions', label: `Nhật ký Quyết định RFC (${decisions.length})`, icon: FileText },
          { id: 'risks', label: 'Ma trận Rủi ro', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'goals' | 'decisions' | 'risks')}
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium transition ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Health Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Điểm Sức khỏe Dự án</span>
                <div className="flex items-baseline space-x-2 my-3">
                  <span className={`text-4xl font-extrabold ${
                    health.score >= 80 ? 'text-emerald-400' : health.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {health.score}
                  </span>
                  <span className="text-sm text-stone-500">/ 100</span>
                </div>
                <div className="text-xs text-stone-400 flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    health.status === 'healthy' ? 'bg-emerald-400' : health.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {health.status === 'healthy' ? 'Tiến độ rất tốt' : health.status === 'warning' ? 'Cần chú ý hạn chót' : 'Báo động trễ hạn'}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Việc Quá hạn (Overdue)</span>
                <div className="text-3xl font-bold text-rose-400 my-3">{health.overdueCount}</div>
                <span className="text-xs text-stone-500">Trừ 15 điểm mỗi việc</span>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Nghẽn Khẩn cấp (Blockers)</span>
                <div className="text-3xl font-bold text-amber-400 my-3">{health.blockedCount}</div>
                <span className="text-xs text-stone-500">Trừ 20 điểm mỗi điểm nghẽn</span>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Tốc độ Hoàn thành</span>
                <div className="text-3xl font-bold text-emerald-400 my-3">{health.velocity}%</div>
                <span className="text-xs text-stone-500">Tỷ lệ hoàn thành nhiệm vụ</span>
              </div>
            </div>

            {/* Công thức tính minh bạch */}
            <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800 text-xs text-stone-400 flex items-start space-x-3">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-300">Công thức minh bạch (Section 31 Master Spec):</strong> Sức khỏe dự án được tính toán tự động dựa trên số liệu thực tế: <code className="bg-stone-800 px-1 py-0.5 rounded text-stone-200">Điểm = 100 - (Quá hạn × 15) - (Nghẽn khẩn cấp × 20)</code>. Không sử dụng điểm số AI ảo.
              </div>
            </div>

            {/* Mục tiêu trọng tâm */}
            <div>
              <h2 className="text-sm font-bold text-stone-200 mb-3 flex items-center">
                <Award className="w-4 h-4 mr-2 text-emerald-400" /> Mục tiêu Đang hoạt động
              </h2>
              {goals.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-stone-800 text-center text-stone-500 text-sm">
                  Chưa có mục tiêu nào được tạo. Chuyển sang thẻ &quot;Mục tiêu&quot; để thêm mới.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {goals.map((g) => (
                    <div key={g.id} className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-mono capitalize">{g.category}</span>
                          <h3 className="font-semibold text-sm text-white mt-1.5">{g.title}</h3>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">{g.progress}%</span>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${g.progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                          <span>Hạn chót: {g.targetDate}</span>
                          <span className="capitalize text-stone-400">{g.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            {/* Form thêm Goal */}
            <form onSubmit={handleCreateGoal} className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Nhập tiêu đề mục tiêu dài hạn (Outcome Goal)..."
                className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              />
              <select
                value={newGoalCategory}
                onChange={(e) => setNewGoalCategory(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none"
              >
                <option value="delivery">Phát hành (Delivery)</option>
                <option value="growth">Phát triển (Growth)</option>
                <option value="learning">Học tập (Learning)</option>
                <option value="system">Hệ thống (System)</option>
              </select>
              <input
                type="date"
                value={newGoalDate}
                onChange={(e) => setNewGoalDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center transition"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Thêm Mục tiêu
              </button>
            </form>

            {/* Danh sách Goals */}
            <div className="space-y-3">
              {goals.map((g) => (
                <div key={g.id} className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-mono capitalize">{g.category}</span>
                      <h3 className="font-semibold text-sm text-white">{g.title}</h3>
                    </div>
                    <p className="text-xs text-stone-400">Thời hạn: {g.targetDate} • Trạng thái: {g.status}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 w-10 text-right">{g.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
              Nhật ký Quyết định Kiến trúc & Sản phẩm (RFC) bảo toàn lý do đưa ra quyết định, giải pháp được chọn và tác động hệ thống.
            </div>
            {decisions.length === 0 ? (
              <div className="p-8 text-center text-stone-500 border border-dashed border-stone-800 rounded-2xl">
                Chưa có quyết định RFC nào. Quyết định được tạo từ Bàn Nghiên cứu hoặc API.
              </div>
            ) : (
              decisions.map((d) => (
                <div key={d.id} className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{d.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400"><strong className="text-stone-300">Bối cảnh:</strong> {d.context}</p>
                  <p className="text-xs text-emerald-300"><strong className="text-stone-300">Quyết định:</strong> {d.decision}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
              Sổ Quản trị Rủi ro (Risk Register): Xác suất xảy ra, mức độ tác động và phương án giảm thiểu chủ động.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400">RỦI RO: Dữ liệu quá tải bộ nhớ trình duyệt</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">Trung bình</span>
                </div>
                <p className="text-xs text-stone-400">Biện pháp: Tự động nén base64 và hỗ trợ xuất JSON dự phòng định kỳ.</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">RỦI RO: Lộ khóa API ra bên ngoài</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">Đã kiểm soát</span>
                </div>
                <p className="text-xs text-stone-400">Biện pháp: Két sắt bảo mật AES-256-GCM Zero-Knowledge và chính sách không gửi context nhạy cảm.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
