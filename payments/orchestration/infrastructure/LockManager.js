const crypto = require("crypto");
const LockAcquisitionError = require("../errors/LockAcquisitionError");

/**
 * In-memory resource locking — no external store.
 */
class LockManager {
  constructor({ defaultTimeoutMs = 30000 } = {}) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.locks = new Map();
    this.versionTokens = new Map();
  }

  acquireLock(resourceId, { ownerId = "system", timeoutMs } = {}) {
    const now = Date.now();
    const ttl = timeoutMs ?? this.defaultTimeoutMs;
    const existing = this.locks.get(resourceId);

    if (existing && existing.expiresAt > now) {
      throw new LockAcquisitionError(resourceId);
    }

    const token = crypto.randomBytes(16).toString("hex");
    const lock = {
      resourceId,
      token,
      ownerId,
      acquiredAt: now,
      expiresAt: now + ttl,
      optimisticVersion: (this.versionTokens.get(resourceId) || 0) + 1,
    };

    this.locks.set(resourceId, lock);
    this.versionTokens.set(resourceId, lock.optimisticVersion);
    return lock;
  }

  releaseLock(resourceId, token) {
    const existing = this.locks.get(resourceId);
    if (!existing || existing.token !== token) {
      return false;
    }
    this.locks.delete(resourceId);
    return true;
  }

  getOptimisticVersion(resourceId) {
    return this.versionTokens.get(resourceId) || 0;
  }

  isLocked(resourceId) {
    const existing = this.locks.get(resourceId);
    return Boolean(existing && existing.expiresAt > Date.now());
  }
}

module.exports = LockManager;
