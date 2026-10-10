'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { PenTool, Sparkles, FileText, RefreshCw, Sliders, Save, AlertTriangle, KeyRound } from 'lucide-react';
import { completeChat, type RemoteAIProvider } from '@/lib/ai/client';

type Stage = 'idea' | 'brief' | 'research' | 'draft' | 'review' | 'approved' | 'published';
interface ContentItem {
  id: string;
  title: string;
  stage: Stage;
  channel: string;
  body: string;
  outline?: string | null;
  tagsJson: string[];
  scheduledAt?: string | null;
}
const STAGES: { key: Stage; label: string }[] = [
  { key: 'idea', label: 'Ý tưởng' },
  { key: 'brief', label: 'Đề cương' },
  { key: 'research', label: 'Nghiên cứu' },
  { key: 'draft', label: 'Bản nháp' },
  { key: 'review', label: 'Biên tập' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'published', label: 'Xuất bản' },
];

export function CreatorStudioApp() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newChannel, setNewChannel] = useState('blog');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiProvider, setAiProvider] = useState<RemoteAIProvider>('groq');
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('openai/gpt-oss-20b');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/creator', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được nội dung Creator Studio.');
      const nextItems = (data.items || []) as ContentItem[];
      setItems(nextItems);
      setSelectedItem((previous) => nextItems.find((item) => item.id === previous?.id) ?? nextItems[0] ?? null);
      setDirty(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được Creator Studio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void loadItems(); });
  }, [loadItems]);

  const persistItem = async (item: ContentItem): Promise<ContentItem> => {
    const response = await fetch('/api/admin/creator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Không lưu được nội dung.');
    return (payload.item || item) as ContentItem;
  };

  const chooseItem = (item: ContentItem) => {
    if (dirty && selectedItem && selectedItem.id !== item.id) {
      const confirmed = window.confirm('Bạn có thay đổi chưa lưu. Bỏ các thay đổi chưa lưu và chuyển sang nội dung khác?');
      if (!confirmed) return;
    }
    setSelectedItem(item);
    setDirty(false);
    setError(null);
    setNotice(null);
  };

  const updateSelected = (updates: Partial<ContentItem>) => {
    setSelectedItem((previous) => previous ? { ...previous, ...updates } : previous);
    setDirty(true);
    setNotice(null);
  };

  const handleSave = async (itemOverride?: ContentItem) => {
    const item = itemOverride ?? selectedItem;
    if (!item) return false;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await persistItem(item);
      setSelectedItem(saved);
      setItems((previous) => previous.map((existing) => existing.id === saved.id ? saved : existing));
      setDirty(false);
      setNotice('Đã lưu nội dung vào database.');
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Lưu nội dung thất bại.');
      setDirty(true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    setNotice(null);
    try {
      setSaving(true);
      const response = await fetch('/api/admin/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), channel: newChannel, stage: 'idea', body: '', tagsJson: [] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tạo được nội dung.');
      setNewTitle('');
      await loadItems();
      setSelectedItem((payload.item || null) as ContentItem | null);
      setDirty(false);
      setNotice('Đã tạo nội dung mới.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được nội dung.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStage = async (stage: Stage) => {
    if (!selectedItem) return;
    await handleSave({ ...selectedItem, stage });
  };

  const handleAiGenerateOutline = async () => {
    if (!selectedItem) return;
    if (aiProvider !== 'ollama' && !apiKey.trim()) {
      setShowAiSettings(true);
      setError('Hãy nhập API key của nhà cung cấp đã chọn trước khi yêu cầu model tạo dàn ý. Chưa có lời gọi AI nào được thực hiện.');
      return;
    }
    setGeneratingAi(true);
    setError(null);
    setNotice(null);
    try {
      const answer = await completeChat({
        provider: aiProvider,
        apiKey,
        model: aiModel,
        baseUrl: aiProvider === 'ollama' ? ollamaUrl : undefined,
        messages: [
          {
            role: 'system',
            content: 'Bạn là biên tập viên. Tạo dàn ý thực dụng cho một nội dung; không tự bịa số liệu hay tuyên bố đã xác minh dữ kiện. Trả về dàn ý tiếng Việt có cấu trúc rõ ràng, phù hợp kênh nội dung.',
          },
          {
            role: 'user',
            content: `Tạo dàn ý cho nội dung sau. Chỉ dùng thông tin trong brief; đánh dấu nội dung cần nghiên cứu nếu chưa có bằng chứng.\nTiêu đề: ${selectedItem.title}\nKênh: ${selectedItem.channel}\nGiai đoạn: ${selectedItem.stage}\nNội dung đã có: ${selectedItem.body.slice(0, 5000) || '(chưa có)'}`,
          },
        ],
      });
      const updated: ContentItem = {
        ...selectedItem,
        outline: answer,
        body: selectedItem.body.trim() ? selectedItem.body : answer,
      };
      const saved = await persistItem(updated);
      setSelectedItem(saved);
      setItems((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setDirty(false);
      setNotice(`Model ${aiModel} đã tạo dàn ý và dàn ý đã được lưu.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không thể tạo dàn ý.';
      setError(message === 'Failed to fetch'
        ? 'Không kết nối được với model. Kiểm tra API key, mạng, CORS hoặc endpoint Ollama. Nội dung cũ vẫn được giữ.'
        : message);
    } finally {
      setGeneratingAi(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl"><PenTool className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white">Creator Studio</h1>
            <p className="text-xs text-stone-400">Pipeline nội dung có lưu database, trạng thái lưu rõ ràng và AI qua provider do bạn cấu hình.</p>
          </div>
        </div>
        <button onClick={() => { if (dirty && !window.confirm('Bỏ các thay đổi chưa lưu để tải lại?')) return; void loadItems(); }} disabled={loading || saving} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50" title="Tải lại dữ liệu"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {error && <div role="alert" className="mx-4 mt-3 p-3 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="mx-4 mt-3 p-3 rounded-xl border border-emerald-800 bg-emerald-950/20 text-emerald-200 text-xs">{notice}</div>}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="w-72 max-w-[42%] border-r border-stone-800 bg-stone-900/30 p-3 flex flex-col gap-3 overflow-y-auto">
          <form onSubmit={handleCreate} className="space-y-2">
            <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Tiêu đề nội dung mới..." className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:border-amber-500 outline-none" />
            <div className="flex gap-2">
              <select value={newChannel} onChange={(event) => setNewChannel(event.target.value)} className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300">
                <option value="blog">Bài viết Blog</option><option value="video">Kịch bản Video</option><option value="social">Mạng xã hội</option><option value="newsletter">Bản tin Email</option>
              </select>
              <button type="submit" disabled={saving || !newTitle.trim()} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs disabled:opacity-50">Tạo</button>
            </div>
          </form>
          <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Nội dung đã lưu ({items.length})</div>
          {loading && <p className="text-xs text-stone-500">Đang tải...</p>}
          {!loading && !items.length && <p className="p-3 border border-dashed border-stone-700 rounded-lg text-xs text-stone-400">Chưa có nội dung. Tạo một mục để bắt đầu.</p>}
          <div className="space-y-2">
            {items.map((item) => (
              <button key={item.id} onClick={() => chooseItem(item)} className={`w-full text-left p-3 rounded-xl border ${selectedItem?.id === item.id ? 'bg-amber-500/10 border-amber-500/40' : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase font-mono text-amber-300">{item.channel}</span><span className="text-[10px] text-stone-500">{item.stage}</span></div>
                <div className="mt-1 text-xs font-semibold text-stone-100">{item.title}</div>
                <div className="mt-1 text-[10px] text-stone-500">{item.body ? `${item.body.length} ký tự` : 'Chưa có nội dung'}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
          {selectedItem ? (
            <>
              <section className="p-4 rounded-2xl border border-stone-800 bg-stone-900/50 space-y-3">
                <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-white">Thông tin nội dung</h2><span className={`text-[10px] ${dirty ? 'text-amber-300' : 'text-emerald-300'}`}>{saving ? 'Đang lưu...' : dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ với database'}</span></div>
                <label className="block space-y-1"><span className="text-[10px] uppercase tracking-wider text-stone-500">Tiêu đề</span><input value={selectedItem.title} onChange={(event) => updateSelected({ title: event.target.value })} className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:border-amber-500 outline-none" /></label>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => void handleSave()} disabled={!dirty || saving} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40"><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                  <button onClick={() => setShowAiSettings((open) => !open)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs"><KeyRound className="w-4 h-4" />Cấu hình AI</button>
                  <button onClick={() => void handleAiGenerateOutline()} disabled={generatingAi || saving} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50"><Sparkles className="w-4 h-4" />{generatingAi ? 'Đang hỏi model...' : 'AI tạo dàn ý'}</button>
                </div>
              </section>

              {showAiSettings && <section className="p-4 rounded-2xl border border-purple-800/60 bg-purple-950/15 space-y-3">
                <div className="flex items-center gap-2 text-purple-200 text-xs font-bold"><Sliders className="w-4 h-4" />Model/provider (khóa không được lưu)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="space-y-1"><span className="block text-[10px] text-stone-500">Provider</span><select value={aiProvider} onChange={(event) => { const next = event.target.value as RemoteAIProvider; setAiProvider(next); if (next === 'groq') setAiModel('openai/gpt-oss-20b'); if (next === 'openai') setAiModel('gpt-4o-mini'); if (next === 'ollama') setAiModel('qwen3.5:2b'); }} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs"><option value="groq">Groq</option><option value="openai">OpenAI</option><option value="ollama">Ollama local</option></select></label>
                  <label className="space-y-1"><span className="block text-[10px] text-stone-500">Model ID</span><input value={aiModel} onChange={(event) => setAiModel(event.target.value)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs" /></label>
                </div>
                {aiProvider === 'ollama' ? <label className="block space-y-1"><span className="block text-[10px] text-stone-500">Base URL</span><input value={ollamaUrl} onChange={(event) => setOllamaUrl(event.target.value)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs" /></label> : <label className="block space-y-1"><span className="block text-[10px] text-stone-500">API key</span><input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Chỉ giữ trong phiên khi cửa sổ đang mở" className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs" /></label>}
                <p className="text-[10px] text-amber-200/80">Khi nhấn AI tạo dàn ý, chỉ tiêu đề, kênh và nội dung hiện đang chọn được gửi trực tiếp tới provider. API key không được ghi vào database của Personal Web OS. CORS hoặc giới hạn provider có thể khiến request thất bại.</p>
              </section>}

              <section className="p-4 rounded-2xl border border-stone-800 bg-stone-900/40 space-y-3">
                <h3 className="text-xs font-bold text-stone-300 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400" />Pipeline trạng thái</h3>
                <div className="flex flex-wrap gap-2">{STAGES.map((stage) => <button key={stage.key} onClick={() => void handleAdvanceStage(stage.key)} disabled={saving || generatingAi} className={`px-3 py-2 rounded-lg text-[11px] font-semibold border disabled:opacity-50 ${selectedItem.stage === stage.key ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'}`}>{stage.label}</button>)}</div>
                <p className="text-[10px] text-stone-500">Chuyển trạng thái sẽ lưu cả trạng thái lẫn các thay đổi hiện tại. Trạng thái “Xuất bản” chỉ là trạng thái trong pipeline, không tự đăng bài ra nền tảng bên ngoài.</p>
              </section>

              {selectedItem.outline && <section className="p-4 rounded-2xl border border-amber-900/50 bg-amber-950/10 space-y-2"><h3 className="text-xs font-bold text-amber-300">Dàn ý đã lưu</h3><pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-stone-300">{selectedItem.outline}</pre></section>}

              <section className="space-y-2"><div className="text-xs font-bold text-stone-300">Nội dung bản nháp</div><textarea value={selectedItem.body} onChange={(event) => updateSelected({ body: event.target.value })} placeholder="Soạn nội dung. Nhấn Lưu thay đổi để ghi xuống database." rows={16} className="w-full p-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200 text-sm focus:outline-none focus:border-amber-500 leading-relaxed font-sans" /></section>
            </>
          ) : <div className="h-full flex flex-col items-center justify-center text-stone-500 text-center"><FileText className="w-8 h-8 mb-3 opacity-50" /><p className="text-sm">{loading ? 'Đang tải nội dung...' : 'Chọn nội dung hoặc tạo mục mới để bắt đầu.'}</p></div>}
        </main>
      </div>
    </div>
  );
}
