const InMemoryRateLimitStore = require("./InMemoryRateLimitStore");

let Redis;
try {
  Redis = require("ioredis");
} catch (_error) {
  Redis = null;
}

class RedisRateLimitStore {
  constructor({ redisUrl, keyPrefix = "comm:ratelimit" } = {}) {
    this.redisUrl = redisUrl;
    this.keyPrefix = keyPrefix;
    this.mode = "redis";
    this.fallback = new InMemoryRateLimitStore();
    this.fallbackActive = false;
    this.client = null;
    this.connecting = null;

    if (!Redis) {
      this.activateFallback("ioredis module not installed");
    }
  }

  activateFallback(reason) {
    if (!this.fallbackActive) {
      console.warn(`[CommunicationRateLimit] Redis unavailable (${reason}). Using in-memory fallback.`);
      this.fallbackActive = true;
    }
  }

  async getClient() {
    if (this.fallbackActive || !Redis) return null;
    if (this.client && this.client.status === "ready") return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve) => {
      const client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        connectTimeout: 1000,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      const settle = (value) => {
        if (this.connecting) resolve(value);
      };

      client.on("error", (error) => {
        this.activateFallback(error.message);
      });

      const timer = setTimeout(() => {
        this.activateFallback("connect timeout");
        settle(null);
      }, 1500);

      client
        .connect()
        .then(() => {
          clearTimeout(timer);
          this.client = client;
          settle(client);
        })
        .catch((error) => {
          clearTimeout(timer);
          this.activateFallback(error.message);
          settle(null);
        })
        .finally(() => {
          this.connecting = null;
        });
    });

    return this.connecting;
  }

  /**
   * Sliding-window counter using a sorted set (cluster-safe key per actor+route).
   */
  async consume(key, { windowMs, max }) {
    if (this.fallbackActive) {
      const result = await this.fallback.consume(key, { windowMs, max });
      return { ...result, mode: "memory-fallback" };
    }

    const client = await this.getClient();
    if (!client) {
      const result = await this.fallback.consume(key, { windowMs, max });
      return { ...result, mode: "memory-fallback" };
    }

    const redisKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

    try {
      const pipeline = client.multi();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zadd(redisKey, now, member);
      pipeline.zcard(redisKey);
      pipeline.pexpire(redisKey, windowMs);
      const results = await pipeline.exec();

      const count = Number(results?.[2]?.[1] || 0);
      const allowed = count <= max;
      return { allowed, count, limit: max, mode: "redis" };
    } catch (error) {
      this.activateFallback(error.message);
      const result = await this.fallback.consume(key, { windowMs, max });
      return { ...result, mode: "memory-fallback" };
    }
  }

  async close() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (_error) {
        // ignore shutdown errors
      }
      this.client = null;
    }
    await this.fallback.close();
  }
}

module.exports = RedisRateLimitStore;
