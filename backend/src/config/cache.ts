/**
 * CacheService — Redis với memory fallback tự động.
 * Nếu Redis không chạy → tự chuyển sang in-memory Map, không cần config gì.
 *
 * Dùng làm:
 *   - Cache key-value với TTL
 *   - EventEmitter nội bộ để thông báo cho SSE clients (không cần Redis pub/sub)
 */
import { EventEmitter } from "events";

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, flag: string, ttl: number): Promise<any>;
  del(key: string): Promise<any>;
  on(event: string, cb: (...args: any[]) => void): void;
  connect(): Promise<void>;
}

class CacheService extends EventEmitter {
  private client: RedisLike | null = null;
  private mem = new Map<string, { v: string; exp: number }>();

  /** Gọi trong server.ts sau khi import ioredis */
  init(redisInstance: RedisLike): void {
    redisInstance.on("ready", () => {
      this.client = redisInstance;
      console.log("✅ Redis connected — distributed cache active");
    });
    redisInstance.on("error", () => {
      this.client = null;
    });
    redisInstance.connect().catch(() => {
      console.log("ℹ️  Redis unavailable — falling back to in-memory cache");
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        const v = await this.client.get(key);
        return v ? (JSON.parse(v) as T) : null;
      } catch {}
    }
    const e = this.mem.get(key);
    if (e && Date.now() < e.exp) return JSON.parse(e.v) as T;
    this.mem.delete(key);
    return null;
  }

  async set(key: string, value: any, ttlMs: number): Promise<void> {
    const s = JSON.stringify(value);
    if (this.client) {
      try {
        await this.client.set(key, s, "PX", ttlMs);
        return;
      } catch {}
    }
    this.mem.set(key, { v: s, exp: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    if (this.client) { try { await this.client.del(key); } catch {} }
    this.mem.delete(key);
  }

  isRedis(): boolean { return !!this.client; }
}

export const cache = new CacheService();
