/**
 * AI observability metrics — Phase 7.2 tool and planner telemetry.
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
    this.toolFailures = 0;
    this.errors = 0;
    this.totalLatencyMs = 0;
    this.totalToolLatencyMs = 0;
    this.lastRequestId = null;
    this.lastCorrelationId = null;
    this.toolUsage = {};
    this.capabilityUsage = {};
    this.plannerDecisions = [];
    this.providerUsage = {};
    this.searchExtractions = 0;
    this.searchExtractionSignals = {};
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
    if (requestId) {
      this.lastRequestId = requestId;
      this.lastCorrelationId = requestId;
    }
  }

  recordProviderCall({ providerId = "mock", correlationId = null } = {}) {
    this.providerCalls += 1;
    this.providerUsage[providerId] = (this.providerUsage[providerId] || 0) + 1;
    if (correlationId) this.lastCorrelationId = correlationId;
  }

  recordToolCall() {
    this.toolCalls += 1;
  }

  recordToolExecution({
    toolId,
    success = true,
    latencyMs = 0,
    capabilities = [],
    correlationId = null,
  } = {}) {
    this.toolCalls += 1;
    this.totalToolLatencyMs += latencyMs;
    this.toolUsage[toolId] = this.toolUsage[toolId] || { calls: 0, failures: 0, latencyMs: 0 };
    this.toolUsage[toolId].calls += 1;
    this.toolUsage[toolId].latencyMs += latencyMs;

    if (!success) {
      this.toolFailures += 1;
      this.toolUsage[toolId].failures += 1;
    }

    for (const capability of capabilities) {
      this.capabilityUsage[capability] = (this.capabilityUsage[capability] || 0) + 1;
    }

    if (correlationId) this.lastCorrelationId = correlationId;
  }

  recordPlannerDecision({
    requestId = null,
    intent = null,
    toolId = null,
    capabilities = [],
    allowed = true,
  } = {}) {
    const entry = Object.freeze({
      requestId,
      intent,
      toolId,
      capabilities: [...capabilities],
      allowed,
      recordedAt: new Date().toISOString(),
    });
    this.plannerDecisions.push(entry);
    if (this.plannerDecisions.length > 100) {
      this.plannerDecisions.shift();
    }
    for (const capability of capabilities) {
      this.capabilityUsage[capability] = (this.capabilityUsage[capability] || 0) + 1;
    }
  }

  recordSearchExtraction({
    language = "en",
    signals = [],
    hasBrand = false,
    hasCategory = false,
    hasPrice = false,
  } = {}) {
    this.searchExtractions += 1;
    this.searchExtractionSignals[language] = (this.searchExtractionSignals[language] || 0) + 1;
    if (hasBrand) this.searchExtractionSignals.brand = (this.searchExtractionSignals.brand || 0) + 1;
    if (hasCategory) {
      this.searchExtractionSignals.category = (this.searchExtractionSignals.category || 0) + 1;
    }
    if (hasPrice) this.searchExtractionSignals.price = (this.searchExtractionSignals.price || 0) + 1;
    for (const signal of signals) {
      this.searchExtractionSignals[signal] = (this.searchExtractionSignals[signal] || 0) + 1;
    }
  }

  getSnapshot() {
    const avgLatencyMs =
      this.requests > 0 ? Math.round(this.totalLatencyMs / this.requests) : 0;
    const avgToolLatencyMs =
      this.toolCalls > 0 ? Math.round(this.totalToolLatencyMs / this.toolCalls) : 0;

    return Object.freeze({
      requests: this.requests,
      chatRequests: this.chatRequests,
      searchRequests: this.searchRequests,
      providerCalls: this.providerCalls,
      toolCalls: this.toolCalls,
      toolFailures: this.toolFailures,
      errors: this.errors,
      avgLatencyMs,
      avgToolLatencyMs,
      lastRequestId: this.lastRequestId,
      lastCorrelationId: this.lastCorrelationId,
      toolUsage: { ...this.toolUsage },
      capabilityUsage: { ...this.capabilityUsage },
      providerUsage: { ...this.providerUsage },
      plannerDecisions: this.plannerDecisions.slice(-10),
      searchExtractions: this.searchExtractions,
      searchExtractionSignals: { ...this.searchExtractionSignals },
    });
  }
}

module.exports = AIMetrics;
