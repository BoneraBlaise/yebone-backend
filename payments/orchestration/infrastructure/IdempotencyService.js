const crypto = require("crypto");
const DuplicateRequestError = require("../errors/DuplicateRequestError");

/**
 * In-memory idempotency guard — no Redis.
 */
class IdempotencyService {
  constructor() {
    this.records = new Map();
  }

  fingerprint(payload) {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  has(key) {
    return this.records.has(key);
  }

  get(key) {
    return this.records.get(key) || null;
  }

  register(key, { fingerprint, result, metadata = {} }) {
    const record = Object.freeze({
      key,
      fingerprint,
      result,
      metadata,
      createdAt: new Date().toISOString(),
      replayProtected: true,
    });
    this.records.set(key, record);
    return record;
  }

  detectDuplicate(key, fingerprint) {
    const existing = this.records.get(key);
    if (!existing) {
      return null;
    }
    if (existing.fingerprint !== fingerprint) {
      throw new DuplicateRequestError(key);
    }
    return existing;
  }

  /**
   * Execute handler once per idempotency key + fingerprint pair.
   */
  async execute(key, payload, handler) {
    const fingerprint = this.fingerprint(payload);
    const duplicate = this.detectDuplicate(key, fingerprint);
    if (duplicate) {
      return { replayed: true, result: duplicate.result };
    }

    const result = await handler();
    this.register(key, { fingerprint, result });
    return { replayed: false, result };
  }
}

module.exports = IdempotencyService;
