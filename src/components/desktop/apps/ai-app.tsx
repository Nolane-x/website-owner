'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Key,
  BookOpen,
  Loader2,
  Calendar,
  CheckCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function AiApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Chào bạn! Tôi là AI Copilot cho Web OS 5.0. Bạn có thể hỏi tôi bất kỳ điều gì về nhiệm vụ, ghi chú, ý tưởng trong Second Brain hoặc yêu cầu tóm tắt công việc hôm nay.',
      timestamp: 'Vừa xong',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<'local' | 'groq' | 'openai'>('local');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Simulate intelligent RAG query over local system
      setTimeout(async () => {
        let reply = '';
        const lower = userText.toLowerCase();

        if (lower.includes('standup') || lower.includes('hôm nay') || lower.includes('báo cáo')) {
          reply = `📋 **Báo cáo Standup Tự động (Web OS 5.0):**\n- **Đang làm:** Hoàn thiện Bàn làm việc Ảo & Window Manager Runtime.\n- **Đã xong:** Database Schema 5.0, CRUD Endpoints cho Inbox, Wallpapers, Research, Decisions.\n- **Kế hoạch tiếp theo:** Kiểm thử 100% Vitest và hoàn tất toàn bộ các bài toán còn lại.`;
        } else if (lower.includes('nhiệm vụ') || lower.includes('task')) {
          reply = `Tôi đã kiểm tra bảng Kanban của bạn: Bạn có các công việc cần chú ý trong cột 'Cần làm' và 'Đang thực hiện'. Bạn có muốn tôi lập kế hoạch phân bổ thời gian (Pomodoro) không?`;
        } else if (lower.includes('inbox') || lower.includes('hộp thư')) {
          reply = `Hộp thư Universal Capture Inbox hiện đang lưu trữ các ý tưởng mới nhất của bạn. Bạn có thể chuyển bất kỳ mục nào thành thẻ Kanban chỉ với 1 cú nhấp chuột.`;
        } else {
          reply = `Tôi đã tiếp nhận câu hỏi của bạn: "${userText}".\n\nHệ thống Second Brain của bạn đang được kết nối với cơ sở dữ liệu PGlite WASM. Khi bạn cấu hình khóa API (Groq/OpenAI/Ollama), tôi sẽ trực tiếp sinh câu trả lời chuyên sâu bằng mô hình LLM cao cấp!`;
        }

        const botMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setLoading(false);
      }, 700);
    } catch {
      setLoading(false);
    }
  };

  const handleGenerateStandup = () => {
    setInput('Tạo báo cáo standup tóm tắt tiến độ hôm nay');
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Top Header */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-800 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-100">AI Copilot & Second Brain RAG</h3>
            <span className="text-[10px] text-stone-400 font-mono">
              Mô hình: {provider.toUpperCase()} (Bảo mật cục bộ)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateStandup}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition text-[11px]"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tạo Standup</span>
          </button>

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`p-1.5 rounded-lg transition ${
              showKeyInput ? 'bg-purple-950 text-purple-300' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Cài đặt khóa API BYOK"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BYOK Settings drawer */}
      {showKeyInput && (
        <div className="p-3 bg-stone-900 border-b border-stone-800 space-y-2 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'local' | 'groq' | 'openai')}
              className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-300"
            >
              <option value="local">Nội bộ (Local Rule/WASM)</option>
              <option value="groq">Groq (Mixtral / Llama 3 70B)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
            </select>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Nhập khóa API (lưu trữ chỉ trên máy bạn)..."
              className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`p-2 rounded-xl text-stone-200 ${
                m.sender === 'user' ? 'bg-emerald-600 text-white' : 'bg-stone-900 border border-stone-800 text-purple-400'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[78%] rounded-2xl p-3 leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-emerald-950/70 border border-emerald-800/80 text-stone-100 rounded-tr-none'
                  : 'bg-stone-900/80 border border-stone-800 text-stone-200 rounded-tl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              <span className="block text-[10px] text-stone-500 mt-1 text-right">{m.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-stone-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span className="text-[11px]">AI Copilot đang tra cứu Second Brain...</span>
          </div>
        )}
      </div>

      {/* Chat input */}
      <form onSubmit={handleSend} className="p-3 border-t border-stone-800 bg-stone-900/50 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi AI về Second Brain, dự án, hoặc ra lệnh tóm tắt..."
          className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-50 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
