'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Calculator, Clipboard, Check, Trash2, RotateCcw } from 'lucide-react';
import { CalculatorInputError, calculateScientificExpression } from '@/lib/tools/scientific-calculator';

const keys = [
  ['AC', 'AC', 'utility'], ['(', '(', 'utility'], [')', ')', 'utility'], ['⌫', 'BACKSPACE', 'utility'],
  ['sin', 'sin(', 'function'], ['cos', 'cos(', 'function'], ['tan', 'tan(', 'function'], ['π', 'pi', 'function'],
  ['7', '7', 'number'], ['8', '8', 'number'], ['9', '9', 'number'], ['÷', '/', 'operator'],
  ['4', '4', 'number'], ['5', '5', 'number'], ['6', '6', 'number'], ['×', '*', 'operator'],
  ['1', '1', 'number'], ['2', '2', 'number'], ['3', '3', 'number'], ['−', '-', 'operator'],
  ['0', '0', 'number'], ['.', '.', 'number'], ['xʸ', '^', 'operator'], ['+', '+', 'operator'],
  ['√', 'sqrt(', 'function'], ['x²', '^2', 'function'], ['log', 'log(', 'function'], ['ln', 'ln(', 'function'],
  ['abs', 'abs(', 'function'], ['n!', '!', 'function'], ['%', '%', 'function'], ['e', 'e', 'function'],
] as const;

type HistoryItem = { expression: string; result: number; key: string };

function formatResult(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 12 }).format(value);
}

export function CalculatorApp() {
  const [expression, setExpression] = useState('sqrt(144) + 2^3');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const calculate = useCallback(() => {
    try {
      const value = calculateScientificExpression(expression, angleMode);
      setResult(value);
      setError('');
      setHistory((previous) => [{ expression, result: value, key: String(Date.now()) + Math.random().toString(36).slice(2, 7) }, ...previous].slice(0, 12));
    } catch (cause) {
      setResult(null);
      setError(cause instanceof CalculatorInputError ? cause.message : 'Không thể tính biểu thức này.');
    }
  }, [angleMode, expression]);

  const insert = (key: string) => {
    setError('');
    if (key === 'AC') {
      setExpression('');
      setResult(null);
    } else if (key === 'BACKSPACE') {
      setExpression((value) => value.slice(0, -1));
    } else {
      setExpression((value) => (value + key).slice(0, 300));
      inputRef.current?.focus();
    }
  };

  const copyResult = async () => {
    if (result === null || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(String(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setError('Không thể sao chép kết quả trên trình duyệt này.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300"><Calculator size={17} /></span>
          <div>
            <h2 className="text-sm font-semibold">Máy tính khoa học</h2>
            <p className="text-[10px] text-slate-400">Chỉ chạy tại trình duyệt của chủ sở hữu · Không gửi dữ liệu lên máy chủ</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-700 p-1">
          {(['deg', 'rad'] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setAngleMode(mode)} aria-pressed={angleMode === mode}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase ${angleMode === mode ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.75fr)]">
        <div className="min-w-0">
          <form onSubmit={(event) => { event.preventDefault(); calculate(); }} className="space-y-3">
            <label htmlFor="owner-calculator-expression" className="text-[11px] font-semibold text-slate-400">Biểu thức</label>
            <input ref={inputRef} id="owner-calculator-expression" value={expression}
              onChange={(event) => { setExpression(event.target.value); setError(''); }} maxLength={300}
              autoComplete="off" spellCheck={false} inputMode="decimal"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-right font-mono text-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              placeholder="Ví dụ: sin(30) + sqrt(81)" />
            <div className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-slate-800 bg-black/30 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Kết quả</p>
                <output aria-live="polite" className="block break-all font-mono text-2xl font-bold text-emerald-300">{result === null ? '—' : formatResult(result)}</output>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={result === null} onClick={copyResult} title="Sao chép kết quả" className="rounded-lg border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40">{copied ? <Check size={15} /> : <Clipboard size={15} />}</button>
                <button type="submit" className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">Tính =</button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
          </form>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {keys.map(([label, value, kind]) => (
              <button key={label} type="button" onClick={() => insert(value)}
                aria-label={label === 'AC' ? 'Xóa toàn bộ' : label === '⌫' ? 'Xóa ký tự cuối' : 'Thêm ' + label}
                className={`min-h-10 rounded-lg border px-2 py-2 text-sm font-semibold transition active:scale-[0.98] ${kind === 'operator' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : kind === 'number' ? 'border-slate-800 bg-slate-900 text-white hover:border-slate-600' : kind === 'utility' ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-200'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-slate-500">Có hỗ trợ số mũ, phần trăm, giai thừa, hằng số π/e, hàm lượng giác, căn, logarit và hàm làm tròn. Đầu vào giới hạn 300 ký tự; không dùng eval hay thực thi JavaScript.</p>
        </div>

        <aside className="flex min-h-[220px] flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Lịch sử tính toán</h3>
              <p className="mt-1 text-[10px] text-slate-500">Chỉ lưu trong phiên hiện tại</p>
            </div>
            <button type="button" onClick={() => setHistory([])} className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-300" title="Xóa lịch sử"><Trash2 size={14} /></button>
          </div>
          {history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-[11px] text-slate-500"><RotateCcw size={20} /> Kết quả gần nhất sẽ xuất hiện ở đây.</div>
          ) : (
            <div className="space-y-1 overflow-auto">
              {history.map((entry) => (
                <button type="button" key={entry.key} onClick={() => { setExpression(entry.expression); setResult(entry.result); setError(''); }}
                  className="w-full rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-slate-700 hover:bg-slate-900">
                  <span className="block break-all font-mono text-[10px] text-slate-400">{entry.expression}</span>
                  <span className="mt-1 block break-all font-mono text-xs font-semibold text-emerald-300">{formatResult(entry.result)}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
