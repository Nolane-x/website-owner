import { describe, expect, it } from 'vitest';
import { CalculatorInputError, calculateScientificExpression } from '@/lib/tools/scientific-calculator';

describe('scientific calculator parser', () => {
  it.each([
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['-2^2', -4],
    ['2^3^2', 512],
    ['2^-2', 0.25],
    ['sqrt(81)', 9],
    ['cbrt(-27)', -3],
    ['log(1000)', 3],
    ['ln(e)', 1],
    ['abs(-5)', 5],
    ['floor(2.9)', 2],
    ['ceil(2.1)', 3],
    ['round(2.5)', 3],
    ['5!', 120],
    ['0!', 1],
    ['50%', 0.5],
  ])('evaluates %s', (expression, expected) => {
    expect(calculateScientificExpression(expression)).toBeCloseTo(expected, 10);
  });

  it('supports degree/radian trigonometry and inverse functions', () => {
    expect(calculateScientificExpression('sin(30)', 'deg')).toBeCloseTo(0.5, 10);
    expect(calculateScientificExpression('sin(pi/6)', 'rad')).toBeCloseTo(0.5, 10);
    expect(calculateScientificExpression('asin(0.5)', 'deg')).toBeCloseTo(30, 10);
    expect(calculateScientificExpression('cos(0)', 'rad')).toBe(1);
  });

  it('supports constants, Unicode pi and common display operators', () => {
    expect(calculateScientificExpression('π')).toBeCloseTo(Math.PI, 12);
    expect(calculateScientificExpression('2 × 3 + 8 ÷ 4')).toBe(8);
    expect(calculateScientificExpression('e^0')).toBe(1);
  });

  it.each([
    '',
    '1/0',
    'sqrt(-1)',
    'log(0)',
    'ln(-2)',
    '2+',
    '(2+3',
    '2+3)',
    'sin 30',
    'unknown(2)',
    '2; process.exit()',
    '1e999',
    '171!',
    '1.5!',
    '1'.repeat(301),
    '1+'.repeat(61) + '1',
  ])('rejects invalid/unsafe expression %j', (expression) => {
    expect(() => calculateScientificExpression(expression)).toThrow(CalculatorInputError);
  });

  it('does not evaluate injected JavaScript', () => {
    expect(() => calculateScientificExpression('globalThis.alert(1)')).toThrow(CalculatorInputError);
    expect((globalThis as Record<string, unknown>).alert).toBeUndefined();
  });
});
