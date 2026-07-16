const RuntimeConfig = require("./RuntimeConfig");

/**
 * Retry policy — idempotent-safe operations only.
 */
class ProviderRetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? RuntimeConfig.defaultMaxRetries;
    this.retryableStatusCodes = new Set(options.retryableStatusCodes || [408, 429, 500, 502, 503, 504]);
  }

  shouldRetry({ attempt, operation, error }) {
    if (attempt >= this.maxRetries) {
      return false;
    }

    const op = String(operation || "").toLowerCase();
    const idempotentOps = new Set(["oauth", "verify", "status", "collection_status"]);
    if (!idempotentOps.has(op) && op !== "oauth") {
      return false;
    }

    if (error?.statusCode && this.retryableStatusCodes.has(error.statusCode)) {
      return true;
    }

    return error?.code === "PROVIDER_TIMEOUT";
  }

  nextDelayMs(attempt) {
    return Math.min(1000 * 2 ** attempt, 8000);
  }
}

module.exports = ProviderRetryPolicy;
