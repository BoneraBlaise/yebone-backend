class InMemoryRateLimitStore {
  constructor() {
    this.hits = new Map();
    this.mode = "memory";
  }

  async consume(key, { windowMs, max }) {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      this.hits.set(key, { windowStart: now, count: 1 });
      return { allowed: true, count: 1, limit: max, mode: this.mode };
    }

    entry.count += 1;
    const allowed = entry.count <= max;
    return { allowed, count: entry.count, limit: max, mode: this.mode };
  }

  async close() {
    this.hits.clear();
  }
}

module.exports = InMemoryRateLimitStore;
