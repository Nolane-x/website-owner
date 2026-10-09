'use client';

import React, { useState, useEffect } from 'react';
import { PenTool, Sparkles, Send, CheckCircle2, FileText, Layers, RefreshCw, Hash, Sliders } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  stage: 'idea' | 'brief' | 'research' | 'draft' | 'review' | 'approved' | 'published';
  channel: string;
  body: string;
  outline?: string;
  tagsJson: string[];
  scheduledAt?: string;
}

export function CreatorStudioApp() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Form thêm mới
  const [newTitle, setNewTitle] = useState('');
  const [newChannel, setNewChannel] = useState('blog');

  // Voice Profile
  const [voiceTone, setVoiceTone] = useState('Chuyên nghiệp, sâu sắc, thực tiễn');
  const [voiceAudience, setVoiceAudience] = useState('Kỹ sư phần mềm & Nhà sáng lập');

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/creator');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.items?.length > 0 && !selectedItem) {
          setSelectedItem(data.items[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/admin/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          channel: newChannel,
          stage: 'idea',
          body: '',
        }),
      });
      if (res.ok) {
        setNewTitle('');
        loadItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdvanceStage = async (nextStage: ContentItem['stage']) => {
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/admin/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedItem,
          stage: nextStage,
        }),
      });
      if (res.ok) {
        setSelectedItem({ ...selectedItem, stage: nextStage });
        loadItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAiGenerateOutline = () => {
    if (!selectedItem) return;
    setGeneratingAi(true);
    setTimeout(() => {
      const outline = `1. Đặt vấn đề: Tại sao chủ đề "${selectedItem.title}" lại quan trọng trong năm 2026?\n2. Phân tích thực trạng & Thách thức cốt lõi.\n3. Giải pháp công nghệ & Kiến trúc đề xuất.\n4. Thực nghiệm & Số liệu kiểm chứng thực tế.\n5. Kết luận & Các bước triển khai tiếp theo.`;
      setSelectedItem({
        ...selectedItem,
        outline,
        body: selectedItem.body || outline,
      });
      setGeneratingAi(false);
    }, 800);
  };

  const stages: { key: ContentItem['stage']; label: string }[] = [
    { key: 'idea', label: 'Ý tưởng' },
    { key: 'brief', label: 'Đề cương' },
    { key: 'research', label: 'Nghiên cứu' },
    { key: 'draft', label: 'Bản nháp' },
    { key: 'review', label: 'Biên tập' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'published', label: 'Xuất bản' },
  ];

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Creator Studio & Content Pipeline</h1>
            <p className="text-xs text-stone-400">Quy trình sản xuất nội dung bài bản từ phác thảo, dàn ý đến xuất bản</p>
          </div>
        </div>

        <button
          onClick={loadItems}
          className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 transition"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Pipeline Column Left */}
        <div className="w-80 border-r border-stone-800 bg-stone-900/30 p-4 flex flex-col space-y-4">
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nhập tiêu đề nội dung mới..."
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center space-x-2">
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none"
              >
                <option value="blog">Bài viết Blog / Tech</option>
                <option value="video">Kịch bản Video</option>
                <option value="social">Mạng xã hội</option>
                <option value="newsletter">Bản tin Email</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
              >
                Tạo
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-3 rounded-xl cursor-pointer transition border ${
                  selectedItem?.id === item.id
                    ? 'bg-amber-500/10 border-amber-500/30 text-white'
                    : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-amber-300">
                    {item.channel}
                  </span>
                  <span className="text-[10px] text-stone-400 capitalize">{item.stage}</span>
                </div>
                <h4 className="text-xs font-semibold text-stone-200 mt-1 line-clamp-2">{item.title}</h4>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Area Right */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
          {selectedItem ? (
            <>
              {/* Stage Progress Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-900 border border-stone-800 overflow-x-auto">
                {stages.map((st, idx) => {
                  const currentIdx = stages.findIndex((s) => s.key === selectedItem.stage);
                  const isCurrent = st.key === selectedItem.stage;
                  const isPast = idx < currentIdx;

                  return (
                    <button
                      key={st.key}
                      onClick={() => handleAdvanceStage(st.key)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isCurrent
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : isPast
                          ? 'text-emerald-400 hover:bg-stone-800'
                          : 'text-stone-500 hover:bg-stone-800'
                      }`}
                    >
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Title and Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">{selectedItem.title}</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAiGenerateOutline}
                      disabled={generatingAi}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-medium transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generatingAi ? 'Đang tạo...' : 'AI Lập Dàn ý'}</span>
                    </button>
                  </div>
                </div>

                {/* Voice Profile Badge */}
                <div className="flex items-center space-x-4 p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span><strong>Giọng văn (Voice Profile):</strong> {voiceTone}</span>
                  <span><strong>Đối tượng:</strong> {voiceAudience}</span>
                </div>

                {/* Outline Preview if any */}
                {selectedItem.outline && (
                  <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 space-y-1">
                    <div className="text-xs font-bold text-amber-300 flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1.5" /> Dàn ý Nội dung:
                    </div>
                    <pre className="text-xs text-stone-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedItem.outline}
                    </pre>
                  </div>
                )}

                {/* Body Editor */}
                <textarea
                  value={selectedItem.body}
                  onChange={(e) => setSelectedItem({ ...selectedItem, body: e.target.value })}
                  placeholder="Soạn thảo nội dung bản nháp..."
                  rows={14}
                  className="w-full p-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200 text-sm focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500 text-sm">
              Chọn hoặc tạo nội dung mới để bắt đầu quy trình biên tập.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
