const InMemoryRateLimitStore = require("./stores/InMemoryRateLimitStore");
const RedisRateLimitStore = require("./stores/RedisRateLimitStore");

let sharedStore = null;
let storeMode = "memory";

function isRateLimitEnabled() {
  const flag = String(process.env.COMMUNICATION_RATE_LIMIT_ENABLED ?? "true").toLowerCase();
  return flag !== "false" && flag !== "0";
}

function resolveWindowMs(override) {
  return Number(
    override ||
      process.env.COMMUNICATION_RATE_LIMIT_WINDOW_MS ||
      process.env.COMMUNICATION_MUTATION_RATE_LIMIT_WINDOW_MS ||
      60_000
  );
}

function resolveMax(override) {
  return Number(
    override ||
      process.env.COMMUNICATION_RATE_LIMIT_MAX ||
      process.env.COMMUNICATION_MUTATION_RATE_LIMIT_MAX ||
      30
  );
}

function getRateLimitStore() {
  if (sharedStore) return sharedStore;

  if (!isRateLimitEnabled()) {
    sharedStore = {
      mode: "disabled",
      async consume() {
        return { allowed: true, count: 0, limit: 0, mode: "disabled" };
      },
    };
    storeMode = "disabled";
    return sharedStore;
  }

  const redisUrl = String(process.env.REDIS_URL || "").trim();
  if (redisUrl) {
    sharedStore = new RedisRateLimitStore({ redisUrl });
    storeMode = "redis";
    return sharedStore;
  }

  sharedStore = new InMemoryRateLimitStore();
  storeMode = "memory";
  return sharedStore;
}

function getRateLimitStoreMode() {
  getRateLimitStore();
  return storeMode;
}

function resetRateLimitStoreForTests() {
  if (sharedStore?.close) {
    sharedStore.close().catch(() => {});
  }
  sharedStore = null;
  storeMode = "memory";
}

module.exports = {
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  getRateLimitStore,
  getRateLimitStoreMode,
  resetRateLimitStoreForTests,
  isRateLimitEnabled,
  resolveWindowMs,
  resolveMax,
};
