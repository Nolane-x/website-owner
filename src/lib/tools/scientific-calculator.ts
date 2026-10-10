export class CalculatorInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculatorInputError';
  }
}

type Token = { type: 'number'; value: number } | { type: 'identifier'; value: string } | { type: 'operator'; value: string };

const MAX_EXPRESSION_LENGTH = 300;
const MAX_TOKENS = 120;
const MAX_FACTORIAL = 170;
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sqrt', 'cbrt', 'abs', 'log', 'ln', 'exp',
  'floor', 'ceil', 'round',
]);

function tokenize(source: string): Token[] {
  if (typeof source !== 'string' || source.trim().length === 0) {
    throw new CalculatorInputError('Hãy nhập biểu thức cần tính.');
  }
  if (source.length > MAX_EXPRESSION_LENGTH) {
    throw new CalculatorInputError('Biểu thức quá dài (tối đa 300 ký tự).');
  }

  const normalized = source.replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const tokens: Token[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char = normalized[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }

    const numberMatch = /^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/.exec(normalized.slice(index));
    if (numberMatch) {
      const value = Number(numberMatch[0]);
      if (!Number.isFinite(value)) throw new CalculatorInputError('Số trong biểu thức không hữu hạn.');
      tokens.push({ type: 'number', value });
      index += numberMatch[0].length;
    } else {
      const identifierMatch = /^[a-zA-Z]+/.exec(normalized.slice(index));
      if (identifierMatch) {
        tokens.push({ type: 'identifier', value: identifierMatch[0].toLowerCase() });
        index += identifierMatch[0].length;
      } else if ('+-*/^()%!'.includes(char)) {
        tokens.push({ type: 'operator', value: char });
        index++;
      } else {
        throw new CalculatorInputError('Ký tự không được hỗ trợ: ' + char);
      }
    }

    if (tokens.length > MAX_TOKENS) {
      throw new CalculatorInputError('Biểu thức có quá nhiều thành phần.');
    }
  }

  return tokens;
}

export function calculateScientificExpression(source: string, angleMode: 'deg' | 'rad' = 'deg'): number {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const consume = () => tokens[position++];
  const toRadians = (value: number) => angleMode === 'deg' ? value * Math.PI / 180 : value;
  const fromRadians = (value: number) => angleMode === 'deg' ? value * 180 / Math.PI : value;

  function parseExpression(): number {
    let value = parseTerm();
    while (peek()?.type === 'operator' && (peek()!.value === '+' || peek()!.value === '-')) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (peek()?.type === 'operator' && (peek()!.value === '*' || peek()!.value === '/')) {
      const operator = consume().value;
      const right = parseUnary();
      if (operator === '/' && right === 0) throw new CalculatorInputError('Không thể chia cho 0.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseUnary(): number {
    if (peek()?.type === 'operator' && (peek()!.value === '+' || peek()!.value === '-')) {
      const operator = consume().value;
      const value = parseUnary();
      return operator === '-' ? -value : value;
    }
    return parsePower();
  }

  function parsePower(): number {
    const base = parsePostfix();
    if (peek()?.type === 'operator' && peek()!.value === '^') {
      consume();
      return base ** parseUnary();
    }
    return base;
  }

  function parsePostfix(): number {
    let value = parsePrimary();
    while (peek()?.type === 'operator' && (peek()!.value === '%' || peek()!.value === '!')) {
      const operator = consume().value;
      if (operator === '%') {
        value /= 100;
      } else {
        if (!Number.isInteger(value) || value < 0 || value > MAX_FACTORIAL) {
          throw new CalculatorInputError('Giai thừa chỉ hỗ trợ số nguyên từ 0 đến 170.');
        }
        let result = 1;
        for (let i = 2; i <= value; i++) result *= i;
        value = result;
      }
    }
    return value;
  }

  function parsePrimary(): number {
    const token = consume();
    if (!token) throw new CalculatorInputError('Biểu thức chưa hoàn chỉnh.');

    if (token.type === 'number') return token.value;

    if (token.type === 'operator' && token.value === '(') {
      const value = parseExpression();
      if (peek()?.type !== 'operator' || consume().value !== ')') {
        throw new CalculatorInputError('Thiếu dấu ngoặc đóng ).');
      }
      return value;
    }

    if (token.type !== 'identifier') {
      throw new CalculatorInputError('Vị trí này cần một số, hằng số, hàm hoặc dấu ngoặc mở.');
    }

    if (token.value === 'pi') return Math.PI;
    if (token.value === 'e') return Math.E;
    if (!FUNCTIONS.has(token.value)) {
      throw new CalculatorInputError('Hằng số hoặc hàm chưa hỗ trợ: ' + token.value);
    }
    if (peek()?.type !== 'operator' || peek()!.value !== '(') {
      throw new CalculatorInputError('Hàm ' + token.value + ' cần đối số trong ngoặc, ví dụ ' + token.value + '(30).');
    }
    consume();
    const argument = parseExpression();
    if (peek()?.type !== 'operator' || consume().value !== ')') {
      throw new CalculatorInputError('Thiếu dấu ngoặc đóng cho hàm ' + token.value + '.');
    }

    switch (token.value) {
      case 'sin': return Math.sin(toRadians(argument));
      case 'cos': return Math.cos(toRadians(argument));
      case 'tan': return Math.tan(toRadians(argument));
      case 'asin': return fromRadians(Math.asin(argument));
      case 'acos': return fromRadians(Math.acos(argument));
      case 'atan': return fromRadians(Math.atan(argument));
      case 'sqrt':
        if (argument < 0) throw new CalculatorInputError('Căn bậc hai trong chế độ số thực không nhận số âm.');
        return Math.sqrt(argument);
      case 'cbrt': return Math.cbrt(argument);
      case 'abs': return Math.abs(argument);
      case 'log':
        if (argument <= 0) throw new CalculatorInputError('log chỉ nhận số dương.');
        return Math.log10(argument);
      case 'ln':
        if (argument <= 0) throw new CalculatorInputError('ln chỉ nhận số dương.');
        return Math.log(argument);
      case 'exp': return Math.exp(argument);
      case 'floor': return Math.floor(argument);
      case 'ceil': return Math.ceil(argument);
      case 'round': return Math.round(argument);
      default: throw new CalculatorInputError('Hàm chưa hỗ trợ.');
    }
  }

  const result = parseExpression();
  if (position !== tokens.length) {
    throw new CalculatorInputError('Biểu thức còn thành phần chưa được xử lý.');
  }
  if (!Number.isFinite(result)) {
    throw new CalculatorInputError('Kết quả không hữu hạn trong miền số thực.');
  }
  return Object.is(result, -0) ? 0 : result;
}
