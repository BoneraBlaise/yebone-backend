/**
 * AI observability metrics — in-process counters for Phase 7.1.
 */
class AIMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.requests = 0;
    this.chatRequests = 0;
    this.searchRequests = 0;
    this.providerCalls = 0;
    this.toolCalls = 0;
    this.errors = 0;
    this.totalLatencyMs = 0;
    this.lastRequestId = null;
  }

  startTimer() {
    const startedAt = Date.now();
    return () => Date.now() - startedAt;
  }

  recordRequest({ type = "chat", requestId = null, latencyMs = 0, success = true } = {}) {
    this.requests += 1;
    if (type === "chat") this.chatRequests += 1;
    if (type === "search") this.searchRequests += 1;
    this.totalLatencyMs += latencyMs;
    if (!success) this.errors += 1;
    if (requestId) this.lastRequestId = requestId;
  }

  recordProviderCall() {
    this.providerCalls += 1;
  }

  recordToolCall() {
    this.toolCalls += 1;
  }

  getSnapshot() {
    const avgLatencyMs =
      this.requests > 0 ? Math.round(this.totalLatencyMs / this.requests) : 0;
    return Object.freeze({
      requests: this.requests,
      chatRequests: this.chatRequests,
      searchRequests: this.searchRequests,
      providerCalls: this.providerCalls,
      toolCalls: this.toolCalls,
      errors: this.errors,
      avgLatencyMs,
      lastRequestId: this.lastRequestId,
    });
  }
}

module.exports = AIMetrics;
