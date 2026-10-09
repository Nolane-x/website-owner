import crypto from 'crypto';

export interface JsonProcessResult {
  success: boolean;
  data?: string;
  error?: string;
}

export function formatJson(input: string, indent = 2): JsonProcessResult {
  try {
    const parsed: unknown = JSON.parse(input);
    return {
      success: true,
      data: JSON.stringify(parsed, null, indent),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Dữ liệu JSON không hợp lệ',
    };
  }
}

export function minifyJson(input: string): JsonProcessResult {
  try {
    const parsed: unknown = JSON.parse(input);
    return {
      success: true,
      data: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Dữ liệu JSON không hợp lệ',
    };
  }
}

export function generateUuidV7(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');
  const randBytes = crypto.randomBytes(10);

  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 = '7' + randBytes.subarray(0, 2).toString('hex').slice(1, 4);

  const varByte = (randBytes[2] & 0x3f) | 0x80;
  const part4 = varByte.toString(16).padStart(2, '0') + randBytes.subarray(3, 4).toString('hex');
  const part5 = randBytes.subarray(4, 10).toString('hex');

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export function generateUuid(version: 'v4' | 'v7' = 'v4', count = 1): string[] {
  const safeCount = Math.min(Math.max(1, count), 100);
  const result: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    if (version === 'v7') {
      result.push(generateUuidV7());
    } else {
      result.push(crypto.randomUUID());
    }
  }
  return result;
}

export interface RegexTestResult {
  matches: string[];
  groups: Record<string, string>[];
  error?: string;
}

export function testRegex(pattern: string, flags: string, text: string): RegexTestResult {
  try {
    const regex = new RegExp(pattern, flags);
    const matches: string[] = [];
    const groups: Record<string, string>[] = [];

    if (flags.includes('g')) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match[0]);
        if (match.groups) {
          groups.push(match.groups);
        }
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else {
      const match = regex.exec(text);
      if (match) {
        matches.push(match[0]);
        if (match.groups) {
          groups.push(match.groups);
        }
      }
    }

    return { matches, groups };
  } catch (err) {
    return {
      matches: [],
      groups: [],
      error: err instanceof Error ? err.message : 'Biểu thức chính quy không hợp lệ',
    };
  }
}

export function hashString(
  input: string,
  algorithm: 'sha256' | 'sha512' | 'md5' | 'base64'
): string {
  if (algorithm === 'base64') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  return crypto.createHash(algorithm).update(input, 'utf-8').digest('hex');
}

export interface TimestampResult {
  iso: string;
  unixSeconds: number;
  unixMs: number;
  relative: string;
}

export function convertTimestamp(input: number | string): TimestampResult {
  let date: Date;

  if (typeof input === 'number') {
    date = input < 10000000000 ? new Date(input * 1000) : new Date(input);
  } else {
    const numeric = Number(input);
    if (!isNaN(numeric)) {
      date = numeric < 10000000000 ? new Date(numeric * 1000) : new Date(numeric);
    } else {
      date = new Date(input);
    }
  }

  const ms = date.getTime();
  const diffSec = Math.round((Date.now() - ms) / 1000);

  let relative = 'Vừa xong';
  if (Math.abs(diffSec) >= 60 && Math.abs(diffSec) < 3600) {
    const min = Math.round(diffSec / 60);
    relative = min > 0 ? `${min} phút trước` : `sau ${Math.abs(min)} phút`;
  } else if (Math.abs(diffSec) >= 3600 && Math.abs(diffSec) < 86400) {
    const hrs = Math.round(diffSec / 3600);
    relative = hrs > 0 ? `${hrs} giờ trước` : `sau ${Math.abs(hrs)} giờ`;
  } else if (Math.abs(diffSec) >= 86400) {
    const days = Math.round(diffSec / 86400);
    relative = days > 0 ? `${days} ngày trước` : `sau ${Math.abs(days)} ngày`;
  }

  return {
    iso: date.toISOString(),
    unixSeconds: Math.floor(ms / 1000),
    unixMs: ms,
    relative,
  };
}
