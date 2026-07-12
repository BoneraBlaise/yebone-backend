/**
 * Retry eligibility and backoff metadata — no timers or queues.
 */
class RetryPolicy {
  calculateBackoff(attempt, { baseMs = 1000, maxMs = 30000, factor = 2 } = {}) {
    const exponential = baseMs * Math.pow(factor, Math.max(0, attempt - 1));
    return Math.min(maxMs, exponential);
  }

  isRetryEligible({ error, attempt, maxAttempts = 3, retryableErrors = [] }) {
    if (attempt >= maxAttempts) {
      return false;
    }
    if (!error) {
      return false;
    }
    if (retryableErrors.length === 0) {
      return error.name === "NotImplementedError";
    }
    return retryableErrors.includes(error.name);
  }

  buildRetryMetadata({ attempt, error, maxAttempts = 3 }) {
    const nextAttempt = attempt + 1;
    return {
      attempt,
      nextAttempt,
      maxAttempts,
      eligible: this.isRetryEligible({ error, attempt, maxAttempts }),
      backoffMs: this.calculateBackoff(nextAttempt),
      errorName: error?.name || null,
      errorMessage: error?.message || null,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

module.exports = RetryPolicy;
