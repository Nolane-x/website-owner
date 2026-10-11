'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Calculator, Check, Clipboard, RotateCcw, ShieldCheck, Ruler } from 'lucide-react';
import { CalculatorInputError, calculateScientificExpression } from '@/lib/tools/scientific-calculator';
import { convertUnits, UNIT_CATEGORIES, type UnitCategory } from '@/lib/tools/unit-converter';

const keys = [
  ['AC', 'AC', 'utility'], ['(', '(', 'utility'], [')', ')', 'utility'], ['⌫', 'BACKSPACE', 'utility'],
  ['sin', 'sin(', 'function'], ['cos', 'cos(', 'function'], ['tan', 'tan(', 'function'], ['π', 'pi', 'function'],
  ['asin', 'asin(', 'function'], ['acos', 'acos(', 'function'], ['atan', 'atan(', 'function'], ['cbrt', 'cbrt(', 'function'],
  ['7', '7', 'number'], ['8', '8', 'number'], ['9', '9', 'number'], ['÷', '/', 'operator'],
  ['4', '4', 'number'], ['5', '5', 'number'], ['6', '6', 'number'], ['×', '*', 'operator'],
  ['1', '1', 'number'], ['2', '2', 'number'], ['3', '3', 'number'], ['−', '-', 'operator'],
  ['0', '0', 'number'], ['.', '.', 'number'], ['xʸ', '^', 'operator'], ['+', '+', 'operator'],
  ['√', 'sqrt(', 'function'], ['x²', '^2', 'function'], ['log', 'log(', 'function'], ['ln', 'ln(', 'function'],
  ['abs', 'abs(', 'function'], ['n!', '!', 'function'], ['%', '%', 'function'], ['e', 'e', 'function'],
  ['exp', 'exp(', 'function'], ['floor', 'floor(', 'function'], ['ceil', 'ceil(', 'function'], ['round', 'round(', 'function'],
] as const;

const unitCategoryChoices: { value: UnitCategory; label: string }[] = [
  { value: 'length', label: 'Độ dài' },
  { value: 'mass', label: 'Khối lượng' },
  { value: 'temperature', label: 'Nhiệt độ' },
  { value: 'time', label: 'Thời gian' },
  { value: 'data', label: 'Dung lượng dữ liệu' },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 12 }).format(value);
}

export function PublicCalculatorTools() {
  const [expression, setExpression] = useState('sqrt(144) + 2^3');
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
  const [calculated, setCalculated] = useState<{ expression: string; value: number } | null>(null);
  const [calculatorError, setCalculatorError] = useState('');
  const [history, setHistory] = useState<{ expression: string; value: number; id: string }[]>([]);
  const [copyState, setCopyState] = useState('');
  const [rawValue, setRawValue] = useState('1');
  const [category, setCategory] = useState<UnitCategory>('length');
  const [fromUnit, setFromUnit] = useState('km');
  const [toUnit, setToUnit] = useState('m');
  const [copyUnitState, setCopyUnitState] = useState('');

  const unitOptions = UNIT_CATEGORIES[category].units;
  const safeFrom = unitOptions.some((unit) => unit.value === fromUnit) ? fromUnit : unitOptions[0].value;
  const safeTo = unitOptions.some((unit) => unit.value === toUnit) ? toUnit : unitOptions[Math.min(1, unitOptions.length - 1)].value;
  const unitResult = useMemo(() => {
    if (!rawValue.trim() || rawValue.length > 60) return { value: null, error: 'Nhập một số hữu hạn, tối đa 60 ký tự.' };
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return { value: null, error: 'Giá trị phải là số hữu hạn.' };
    try {
      return { value: convertUnits(value, category, safeFrom, safeTo), error: '' };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'Không thể chuyển đổi đơn vị.' };
    }
  }, [category, rawValue, safeFrom, safeTo]);

  const calculate = () => {
    try {
      const value = calculateScientificExpression(expression, angleMode);
      setCalculated({ expression, value });
      setCalculatorError('');
      setHistory((previous) => [{
        expression,
        value,
        id: String(Date.now()) + '-' + previous.length,
      }, ...previous].slice(0, 8));
    } catch (error) {
      setCalculated(null);
      setCalculatorError(error instanceof CalculatorInputError ? error.message : 'Không thể tính biểu thức này.');
    }
  };

  const insert = (key: string) => {
    setCalculatorError('');
    if (key === 'AC') {
      setExpression('');
      setCalculated(null);
    } else if (key === 'BACKSPACE') {
      setExpression((previous) => previous.slice(0, -1));
    } else {
      setExpression((previous) => (previous + key).slice(0, 300));
    }
  };

  const copyText = async (text: string, kind: 'calculator' | 'unit') => {
    if (!navigator.clipboard) {
      if (kind === 'calculator') setCalculatorError('Trình duyệt hiện không cho phép sao chép.');
      else setCopyUnitState('Không thể sao chép trên trình duyệt này.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      if (kind === 'calculator') {
        setCopyState('copied');
        window.setTimeout(() => setCopyState(''), 1200);
      } else {
        setCopyUnitState('Đã sao chép kết quả.');
        window.setTimeout(() => setCopyUnitState(''), 1200);
      }
    } catch {
      if (kind === 'calculator') setCalculatorError('Không thể sao chép kết quả.');
      else setCopyUnitState('Không thể sao chép kết quả.');
    }
  };

  return (
    <section className="space-y-5" aria-label="Công cụ chạy tại trình duyệt">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-[var(--accent)]"><ShieldCheck size={14} /> OFFLINE TOOLKIT</div>
          <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)]">Công cụ dùng ngay, không gửi dữ liệu</h2>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-[var(--text-secondary)]">Máy tính và đổi đơn vị hoạt động hoàn toàn ở trình duyệt. Không đăng nhập, không gọi API, không cần khóa hay tài khoản dịch vụ.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-600/25 bg-emerald-600/5 px-3 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300"><ShieldCheck size={12} /> Local-only</span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[var(--accent-light)] p-2 text-[var(--accent)]"><Calculator size={17} /></span>
              <div><h3 className="text-lg font-serif font-bold">Máy tính khoa học</h3><p className="text-[11px] text-[var(--text-muted)]">Tối đa 300 ký tự / biểu thức</p></div>
            </div>
            <div className="flex rounded-lg border border-[var(--border-color)] p-1">
              {(['deg', 'rad'] as const).map((mode) => <button key={mode} type="button" onClick={() => setAngleMode(mode)} aria-pressed={angleMode === mode} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase ${angleMode === mode ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'}`}>{mode}</button>)}
            </div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); calculate(); }} className="space-y-3">
            <label htmlFor="public-calculator-expression" className="sr-only">Biểu thức toán học</label>
            <input id="public-calculator-expression" value={expression} maxLength={300} autoComplete="off" spellCheck={false} inputMode="decimal" onChange={(event) => { setExpression(event.target.value); setCalculatorError(''); }} placeholder="sqrt(81) + sin(30)" className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-3.5 text-right font-mono text-base outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent)]/10" />
            <div className="flex min-h-[76px] items-center justify-between gap-3 rounded-xl bg-[var(--bg-surface-subtle)] px-3 py-3">
              <div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Kết quả</p><output aria-live="polite" className="block break-all font-mono text-xl font-bold text-[var(--text-primary)]">{calculated ? formatNumber(calculated.value) : '—'}</output></div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={!calculated} onClick={() => calculated && void copyText(String(calculated.value), 'calculator')} title="Sao chép kết quả" className="rounded-lg border border-[var(--border-color)] p-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-40">{copyState === 'copied' ? <Check size={15} /> : <Clipboard size={15} />}</button>
                <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Tính =</button>
              </div>
            </div>
            {calculatorError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">{calculatorError}</p>}
          </form>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
            {keys.map(([label, value, kind]) => <button key={label} type="button" onClick={() => insert(value)} aria-label={label === 'AC' ? 'Xóa toàn bộ' : label === '⌫' ? 'Xóa ký tự cuối' : 'Thêm ' + label} className={`min-h-10 rounded-lg border px-1 py-2 text-xs font-semibold transition active:scale-[0.98] sm:text-sm ${kind === 'operator' ? 'border-[var(--accent)]/20 bg-[var(--accent-light)] text-[var(--accent)]' : kind === 'number' ? 'border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-primary)] hover:border-[var(--border-focus)]' : kind === 'utility' ? 'border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)]' : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent)]'}`}>{label}</button>)}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
            <p className="text-[10px] text-[var(--text-muted)]">sin/cos/tan + hàm ngược · √/cbrt · lũy thừa · log/ln/exp · làm tròn · ! · % · π · e</p>
            <button type="button" onClick={() => { setExpression(''); setCalculated(null); setCalculatorError(''); setHistory([]); }} className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)]"><RotateCcw size={11} /> Xóa phiên</button>
          </div>
          {history.length > 0 && <div className="mt-3 space-y-1.5"><p className="text-[11px] font-semibold text-[var(--text-secondary)]">Lịch sử gần đây</p>{history.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => { setExpression(item.expression); setCalculated({ expression: item.expression, value: item.value }); setCalculatorError(''); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--bg-surface-subtle)]"><span className="min-w-0 truncate font-mono text-[10px] text-[var(--text-muted)]">{item.expression}</span><span className="shrink-0 font-mono text-xs font-semibold">{formatNumber(item.value)}</span></button>)}</div>}
          <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">Biểu thức được phân tích bởi parser giới hạn; không dùng eval, không thực thi JavaScript và không rời thiết bị của bạn.</p>
        </article>

        <article className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-lg bg-[var(--accent-light)] p-2 text-[var(--accent)]"><Ruler size={17} /></span>
            <div><h3 className="text-lg font-serif font-bold">Đổi đơn vị đa năng</h3><p className="text-[11px] text-[var(--text-muted)]">Độ dài, khối lượng, nhiệt độ, thời gian và dữ liệu</p></div>
          </div>
          <div className="space-y-4">
            <div><label htmlFor="public-unit-category" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Nhóm đơn vị</label><select id="public-unit-category" value={category} onChange={(event) => { const nextCategory = event.target.value as UnitCategory; const options = UNIT_CATEGORIES[nextCategory].units; setCategory(nextCategory); setFromUnit(options[0].value); setToUnit(options[Math.min(1, options.length - 1)].value); }} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2.5 text-sm outline-none focus:border-[var(--border-focus)]">{unitCategoryChoices.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div><label htmlFor="public-unit-value" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Giá trị cần đổi</label><input id="public-unit-value" type="number" inputMode="decimal" value={rawValue} onChange={(event) => setRawValue(event.target.value.slice(0, 60))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-3 font-mono text-base outline-none focus:border-[var(--border-focus)]" /></div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <div className="min-w-0"><label htmlFor="public-unit-from" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Từ</label><select id="public-unit-from" value={safeFrom} onChange={(event) => setFromUnit(event.target.value)} className="w-full min-w-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-2 py-3 text-xs outline-none focus:border-[var(--border-focus)]">{unitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div>
              <button type="button" onClick={() => { setFromUnit(safeTo); setToUnit(safeFrom); }} aria-label="Đảo ngược đơn vị" className="mb-0.5 rounded-lg border border-[var(--border-color)] p-2.5 text-[var(--accent)] hover:bg-[var(--bg-surface-subtle)]"><ArrowLeftRight size={16} /></button>
              <div className="min-w-0"><label htmlFor="public-unit-to" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Sang</label><select id="public-unit-to" value={safeTo} onChange={(event) => setToUnit(event.target.value)} className="w-full min-w-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-2 py-3 text-xs outline-none focus:border-[var(--border-focus)]">{unitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div>
            </div>
            <div className="rounded-xl bg-[var(--bg-surface-subtle)] p-4">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Kết quả chuyển đổi</p>
              <div className="mt-1 flex items-start justify-between gap-3"><output aria-live="polite" className="break-all font-mono text-xl font-bold text-[var(--text-primary)]">{unitResult.value === null ? '—' : formatNumber(unitResult.value)}</output><button type="button" disabled={unitResult.value === null} onClick={() => unitResult.value !== null && void copyText(String(unitResult.value), 'unit')} title="Sao chép kết quả" className="shrink-0 rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-40">{copyUnitState === 'Đã sao chép kết quả.' ? <Check size={14} /> : <Clipboard size={14} />}</button></div>
              {unitResult.error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300">{unitResult.error}</p>}
              {copyUnitState && <p aria-live="polite" className="mt-2 text-[10px] text-[var(--text-muted)]">{copyUnitState}</p>}
            </div>
            <p className="text-[10px] leading-5 text-[var(--text-muted)]">Các đơn vị dữ liệu phân biệt rõ hệ thập phân (MB = 1.000.000 byte) và hệ nhị phân (MiB = 1.048.576 byte). Nhiệt độ được kiểm tra không thấp hơn độ không tuyệt đối.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
