'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, RotateCw, Plus, Award } from 'lucide-react';

interface LearningCard {
  id: string;
  deckName: string;
  front: string;
  back: string;
  difficulty: number;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
}

export function LearningLabApp() {
  const [cards, setCards] = useState<LearningCard[]>([]);
  const [dueCards, setDueCards] = useState<LearningCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form tạo thẻ mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newDeck, setNewDeck] = useState('Kiến trúc Hệ thống');

  const loadCards = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/learning');
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
        const today = new Date().toISOString().split('T')[0];
        const due = (data.cards || []).filter((c: LearningCard) => c.nextReviewDate <= today);
        setDueCards(due);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadCards();
    });
  }, [loadCards]);

  const handleReview = async (rating: number) => {
    const card = dueCards[currentIndex];
    if (!card) return;

    try {
      const res = await fetch('/api/admin/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          cardId: card.id,
          rating,
        }),
      });

      if (!res.ok) {
        console.error('Không thể lưu kết quả ôn tập');
        return;
      }

      setIsFlipped(false);
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        loadCards();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    try {
      const res = await fetch('/api/admin/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckName: newDeck,
          front: newFront,
          back: newBack,
        }),
      });
      if (res.ok) {
        setNewFront('');
        setNewBack('');
        setShowAddModal(false);
        loadCards();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentCard = dueCards[currentIndex];

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Learning Lab & Spaced Repetition</h1>
            <p className="text-xs text-stone-400">Ôn tập ngắt quãng thông minh Anki/SM-2 củng cố trí nhớ dài hạn</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Thẻ Ghi Nhớ</span>
        </button>
      </div>

      {/* Main Flashcard Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {loading ? (
          <div className="text-stone-400 text-sm">Đang tải bộ thẻ học tập...</div>
        ) : dueCards.length === 0 ? (
          <div className="text-center max-w-md p-8 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Bạn đã hoàn thành bài ôn hôm nay!</h3>
            <p className="text-xs text-stone-400">
              Tổng số thẻ trong kho: {cards.length}. Không có thẻ nào đến hạn ôn tập lúc này. Trí nhớ của bạn đang được duy trì ở trạng thái tối ưu.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium transition"
            >
              Thêm thẻ kiến thức mới
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xl space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>Bộ thẻ: <strong className="text-emerald-400">{currentCard.deckName}</strong></span>
              <span>Thẻ {currentIndex + 1} / {dueCards.length}</span>
            </div>

            {/* Flip Flashcard Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`min-h-[260px] p-8 rounded-3xl cursor-pointer border transition-all duration-300 flex flex-col justify-between shadow-2xl select-none ${
                isFlipped
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100 ring-2 ring-emerald-500/20'
                  : 'bg-stone-900 border-stone-800 text-stone-100 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                  {isFlipped ? 'Đáp án / Giải thích' : 'Câu hỏi / Khái niệm'}
                </span>
                <span className="text-xs text-stone-500 flex items-center">
                  <RotateCw className="w-3.5 h-3.5 mr-1" /> Click để lật thẻ
                </span>
              </div>

              <div className="my-6 text-center">
                <p className="text-lg font-bold leading-relaxed">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
              </div>

              <div className="text-[11px] text-stone-500 text-center">
                {isFlipped ? 'Chọn mức độ ghi nhớ bên dưới' : 'Thử tự trả lời trước khi lật thẻ'}
              </div>
            </div>

            {/* Anki Review Buttons (Again, Hard, Good, Easy) */}
            {isFlipped && (
              <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-200">
                <button
                  onClick={() => handleReview(1)}
                  className="py-2.5 px-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition flex flex-col items-center"
                >
                  <span>Lại (Again)</span>
                  <span className="text-[10px] text-rose-400 font-normal">1 ngày</span>
                </button>
                <button
                  onClick={() => handleReview(2)}
                  className="py-2.5 px-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition flex flex-col items-center"
                >
                  <span>Khó (Hard)</span>
                  <span className="text-[10px] text-amber-400 font-normal">1.2x</span>
                </button>
                <button
                  onClick={() => handleReview(3)}
                  className="py-2.5 px-2 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 text-xs font-bold transition flex flex-col items-center"
                >
                  <span>Tốt (Good)</span>
                  <span className="text-[10px] text-sky-400 font-normal">Chu kỳ</span>
                </button>
                <button
                  onClick={() => handleReview(4)}
                  className="py-2.5 px-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition flex flex-col items-center"
                >
                  <span>Dễ (Easy)</span>
                  <span className="text-[10px] text-emerald-400 font-normal">+15% Ease</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCard}
            className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Thêm Thẻ Ghi Nhớ Kiến Thức</h3>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Tên bộ thẻ (Deck)</label>
              <input
                type="text"
                value={newDeck}
                onChange={(e) => setNewDeck(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Mặt trước (Câu hỏi / Khái niệm)</label>
              <textarea
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Định lý CAP trong hệ thống phân tán phát biểu điều gì?"
                className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Mặt sau (Đáp án / Diễn giải)</label>
              <textarea
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Một hệ thống phân tán chỉ có thể đồng thời thỏa mãn tối đa 2 trong 3 yếu tố: Consistency, Availability, Partition Tolerance."
                className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
              >
                Lưu Thẻ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
