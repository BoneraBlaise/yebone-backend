/**
 * Retry policy contract — architecture only, no execution.
 * Future dispatch/retry modules inject policies without modifying EventBus core.
 */
class RetryPolicy {
  /**
   * @param {{ attempt: number, error: Error, envelope?: object }} context
   * @returns {boolean}
   */
  shouldRetry(context) {
    throw new Error("RetryPolicy.shouldRetry() must be implemented by subclass");
  }

  /**
   * @returns {number}
   */
  maxAttempts() {
    throw new Error("RetryPolicy.maxAttempts() must be implemented by subclass");
  }

  /**
   * @param {{ attempt: number, error: Error, envelope?: object }} context
   * @returns {number} delay in milliseconds
   */
  nextDelay(context) {
    throw new Error("RetryPolicy.nextDelay() must be implemented by subclass");
  }

  /**
   * Terminal failure hook — observability only, no side effects required.
   * @param {{ attempt: number, error: Error, envelope?: object }} context
   */
  onFailure(context) {
    return {
      attempt: context?.attempt ?? 0,
      error: context?.error?.message || "unknown",
      retriable: false,
    };
  }

  static assertImplements(policy) {
    if (!policy || typeof policy.shouldRetry !== "function") {
      throw new Error("RetryPolicy must implement shouldRetry()");
    }
    if (typeof policy.maxAttempts !== "function") {
      throw new Error("RetryPolicy must implement maxAttempts()");
    }
    if (typeof policy.nextDelay !== "function") {
      throw new Error("RetryPolicy must implement nextDelay()");
    }
  }
}

module.exports = RetryPolicy;
