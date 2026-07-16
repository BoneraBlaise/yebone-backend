const RuntimeConfig = require("./RuntimeConfig");

/**
 * Timeout policy for provider HTTP calls.
 */
class ProviderTimeoutPolicy {
  constructor(options = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs || RuntimeConfig.defaultTimeoutMs;
  }

  resolve(operation) {
    const timeouts = {
      oauth: this.defaultTimeoutMs,
      collection: this.defaultTimeoutMs,
      disbursement: this.defaultTimeoutMs,
      default: this.defaultTimeoutMs,
    };

    const key = String(operation || "default").toLowerCase();
    return Object.freeze({
      operation: key,
      timeoutMs: timeouts[key] || timeouts.default,
    });
  }
}

module.exports = ProviderTimeoutPolicy;
