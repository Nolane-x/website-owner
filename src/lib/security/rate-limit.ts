import { isIP } from 'node:net';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_RATE_LIMIT_KEYS = 20_000;

class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private operationCount = 0;

  constructor() {
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.removeExpired(Date.now()), 60000);
      if (this.cleanupInterval.unref) this.cleanupInterval.unref();
    }
  }

  private removeExpired(now: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) this.store.delete(key);
    }
  }

  public check(
    key: string,
    limit: number,
    windowSeconds: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    this.operationCount++;
    if (this.operationCount % 256 === 0) {
      this.removeExpired(now);
    }

    let entry = this.store.get(key);
    if (entry && entry.resetAt <= now) {
      this.store.delete(key);
      entry = undefined;
    }
    if (!entry) {
      const resetAt = now + windowSeconds * 1000;
      if (this.store.size >= MAX_TRACKED_RATE_LIMIT_KEYS) {
        // Fail closed at capacity instead of evicting active budgets, which
        // would let an attacker rotate spoofed IPs to erase other users' limits.
        return { allowed: false, remaining: 0, resetAt };
      }
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
    };
  }

  public reset(key: string) {
    this.store.delete(key);
  }
}

export const rateLimiter = new MemoryRateLimiter();

/**
 * Resolve the client address from the forwarding chain produced by the
 * nearest trusted platform proxy. Use the right-most valid forwarded address:
 * proxies generally append the actual connecting client after caller-supplied
 * values. Do not blindly trust the left-most X-Forwarded-For value.
 *
 * The limiter remains best-effort per process; production edge rules should
 * also be enabled because serverless instances do not share this Map.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const addresses = forwarded.split(',').map((part) => part.trim());
    for (let index = addresses.length - 1; index >= 0; index--) {
      if (isIP(addresses[index])) return addresses[index];
    }
  }

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const cfConnectingIp = headers.get('cf-connecting-ip')?.trim();
  if (cfConnectingIp && isIP(cfConnectingIp)) return cfConnectingIp;

  return '127.0.0.1';
}
