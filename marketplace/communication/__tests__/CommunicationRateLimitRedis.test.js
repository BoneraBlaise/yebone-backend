const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const RedisRateLimitStore = require("../stores/RedisRateLimitStore");

describe("Communication Redis Rate Limit Store", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it("falls back to memory when Redis URL is unreachable", async () => {
    const store = new RedisRateLimitStore({ redisUrl: "redis://127.0.0.1:6399" });
    const result = await store.consume("fallback-key", { windowMs: 60_000, max: 5 });
    assert.equal(result.allowed, true);
    assert.match(result.mode, /fallback|memory/);
    await store.close();
  });

  it("enforces limits in memory fallback mode", async () => {
    const store = new RedisRateLimitStore({ redisUrl: "redis://127.0.0.1:6399" });
    store.fallbackActive = true;
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      results.push(await store.consume("limit-key", { windowMs: 60_000, max: 3 }));
    }
    assert.equal(results.filter((r) => r.allowed).length, 3);
    assert.equal(results.some((r) => !r.allowed), true);
    await store.close();
  });
});
