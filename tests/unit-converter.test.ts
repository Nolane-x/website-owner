import { describe, expect, it } from 'vitest';
import { convertUnits, UNIT_CATEGORIES } from '@/lib/tools/unit-converter';

describe('offline unit converter', () => {
  it('covers common unit categories and keeps binary vs decimal data units explicit', () => {
    expect(Object.keys(UNIT_CATEGORIES)).toEqual(['length', 'mass', 'temperature', 'time', 'data']);
    expect(UNIT_CATEGORIES.data.units.find((unit) => unit.value === 'MB')?.factor).toBe(1_000_000);
    expect(UNIT_CATEGORIES.data.units.find((unit) => unit.value === 'MiB')?.factor).toBe(1_048_576);
  });

  it.each([
    [1, 'km', 'm', 1000],
    [100, 'cm', 'm', 1],
    [1, 'mi', 'km', 1.609344],
    [1, 'kg', 'lb', 2.2046226218487757],
    [1000, 'g', 'kg', 1],
    [60, 's', 'min', 1],
    [1, 'day', 'h', 24],
    [1, 'GB', 'MB', 1000],
    [1, 'MiB', 'KiB', 1024],
  ] as const)('converts %s %s to %s', (value, from, to, expected) => {
    const category = from === 'km' || from === 'cm' || from === 'mi' ? 'length'
      : from === 'kg' || from === 'g' ? 'mass'
      : from === 's' || from === 'day' ? 'time'
      : 'data';
    expect(convertUnits(value, category, from, to)).toBeCloseTo(expected, 10);
  });

  it.each([
    [0, 'c', 'f', 32],
    [100, 'c', 'f', 212],
    [32, 'f', 'c', 0],
    [273.15, 'k', 'c', 0],
    [-40, 'c', 'f', -40],
  ] as const)('converts temperature %s %s to %s', (value, from, to, expected) => {
    expect(convertUnits(value, 'temperature', from, to)).toBeCloseTo(expected, 10);
  });

  it('rejects temperatures below absolute zero and invalid groups or values', () => {
    expect(() => convertUnits(-274, 'temperature', 'c', 'k')).toThrow('độ không tuyệt đối');
    expect(() => convertUnits(-500, 'temperature', 'f', 'c')).toThrow('độ không tuyệt đối');
    expect(() => convertUnits(Number.NaN, 'length', 'm', 'km')).toThrow('hữu hạn');
    expect(() => convertUnits(Number.POSITIVE_INFINITY, 'mass', 'kg', 'g')).toThrow('hữu hạn');
    expect(() => convertUnits(1, 'length', 'kg', 'g')).toThrow('không thuộc nhóm');
    expect(() => convertUnits(1, 'mass', 'kg', 'unknown')).toThrow('không thuộc nhóm');
  });
});
