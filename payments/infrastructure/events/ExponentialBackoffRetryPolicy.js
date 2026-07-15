const RetryPolicy = require("./RetryPolicy");

/**
 * Reference retry policy — exponential backoff with jitter.
 * Not wired to EventDispatcher; provided as pluggable architecture example.
 */
class ExponentialBackoffRetryPolicy extends RetryPolicy {
  constructor({
    maxAttempts = 3,
    baseDelayMs = 250,
    maxDelayMs = 5000,
    jitterMs = 50,
    retriableErrors = null,
  } = {}) {
    super();
    this._maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.jitterMs = jitterMs;
    this.retriableErrors = retriableErrors;
  }

  shouldRetry(context = {}) {
    const attempt = Number(context.attempt || 0);
    if (attempt >= this.maxAttempts()) {
      return false;
    }
    if (this.retriableErrors && context.error) {
      return this.retriableErrors.includes(context.error.code);
    }
    return true;
  }

  maxAttempts() {
    return this._maxAttempts;
  }

  nextDelay(context = {}) {
    const attempt = Math.max(1, Number(context.attempt || 1));
    const exponential = this.baseDelayMs * 2 ** (attempt - 1);
    const capped = Math.min(exponential, this.maxDelayMs);
    const jitter = Math.floor(Math.random() * this.jitterMs);
    return capped + jitter;
  }

  onFailure(context = {}) {
    return {
      ...super.onFailure(context),
      policy: "exponential_backoff",
      maxAttempts: this.maxAttempts(),
    };
  }
}

module.exports = ExponentialBackoffRetryPolicy;
