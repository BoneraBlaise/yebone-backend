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
    this.conversationCount = 0;
    this.conversationTurns = 0;
    this.followUpRequests = 0;
    this.toolReuseCount = 0;
    this.newToolExecutions = 0;
    this.conversationSessions = new Set();
    this.averageTurns = 0;
    this.recommendationRequests = 0;
    this.recommendationGenerations = 0;
    this.recommendationReuseCount = 0;
    this.recommendationLatencyMs = 0;
    this.recommendationReasons = {};
    this.checkoutRequests = 0;
    this.checkoutComparisons = 0;
    this.checkoutGuidanceGenerations = 0;
    this.checkoutReuseCount = 0;
    this.checkoutLatencyMs = 0;
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

  recordToolReuse({ toolId, sessionId = null, correlationId = null } = {}) {
    this.toolUsage[toolId] = this.toolUsage[toolId] || { calls: 0, failures: 0, latencyMs: 0, reuses: 0 };
    this.toolUsage[toolId].reuses = (this.toolUsage[toolId].reuses || 0) + 1;
    if (correlationId) this.lastCorrelationId = correlationId;
    if (sessionId) this.conversationSessions.add(String(sessionId));
  }

  recordConversationTurn({
    sessionId = null,
    followUp = false,
    toolStrategy = "execute",
    turnCount = 0,
  } = {}) {
    this.conversationTurns += 1;
    if (sessionId) {
      const key = String(sessionId);
      if (!this.conversationSessions.has(key)) {
        this.conversationSessions.add(key);
        this.conversationCount += 1;
      }
    }
    if (followUp) this.followUpRequests += 1;
    if (toolStrategy === "reuse") {
      this.toolReuseCount += 1;
    } else {
      this.newToolExecutions += 1;
    }
    if (turnCount > 0) {
      this.averageTurns =
        this.conversationCount > 0
          ? Math.round((this.conversationTurns / this.conversationCount) * 10) / 10
          : turnCount;
    }
  }

  recordRecommendationRequest({ sessionId = null, reused = false, correlationId = null } = {}) {
    this.recommendationRequests += 1;
    if (reused) this.recommendationReuseCount += 1;
    if (sessionId) this.conversationSessions.add(String(sessionId));
    if (correlationId) this.lastCorrelationId = correlationId;
  }

  recordRecommendationGeneration({
    count = 0,
    latencyMs = 0,
    reused = false,
    reasons = [],
    correlationId = null,
  } = {}) {
    this.recommendationGenerations += 1;
    this.recommendationLatencyMs += latencyMs;
    if (reused) this.recommendationReuseCount += 1;
    for (const reason of reasons) {
      const key = String(reason).slice(0, 80);
      this.recommendationReasons[key] = (this.recommendationReasons[key] || 0) + 1;
    }
    if (count === 0) {
      this.recommendationReasons.empty = (this.recommendationReasons.empty || 0) + 1;
    }
    if (correlationId) this.lastCorrelationId = correlationId;
  }

  recordCheckoutRequest({
    sessionId = null,
    reused = false,
    comparison = false,
    correlationId = null,
  } = {}) {
    this.checkoutRequests += 1;
    if (comparison) this.checkoutComparisons += 1;
    if (reused) this.checkoutReuseCount += 1;
    if (sessionId) this.conversationSessions.add(String(sessionId));
    if (correlationId) this.lastCorrelationId = correlationId;
  }

  recordCheckoutGeneration({
    comparisonCount = 0,
    latencyMs = 0,
    reused = false,
    guidance = [],
    correlationId = null,
  } = {}) {
    this.checkoutGuidanceGenerations += 1;
    this.checkoutLatencyMs += latencyMs;
    if (comparisonCount > 1) this.checkoutComparisons += 1;
    if (reused) this.checkoutReuseCount += 1;
    if (comparisonCount === 0 && guidance.length === 0) {
      this.recommendationReasons.checkout_empty =
        (this.recommendationReasons.checkout_empty || 0) + 1;
    }
    if (correlationId) this.lastCorrelationId = correlationId;
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
      conversationCount: this.conversationCount,
      conversationTurns: this.conversationTurns,
      followUpRequests: this.followUpRequests,
      toolReuseCount: this.toolReuseCount,
      newToolExecutions: this.newToolExecutions,
      averageTurns: this.averageTurns || 0,
      recommendationRequests: this.recommendationRequests,
      recommendationGenerations: this.recommendationGenerations,
      recommendationReuseCount: this.recommendationReuseCount,
      averageRecommendationLatencyMs:
        this.recommendationGenerations > 0
          ? Math.round(this.recommendationLatencyMs / this.recommendationGenerations)
          : 0,
      recommendationReasons: { ...this.recommendationReasons },
      checkoutRequests: this.checkoutRequests,
      checkoutComparisons: this.checkoutComparisons,
      checkoutGuidanceGenerations: this.checkoutGuidanceGenerations,
      checkoutReuseCount: this.checkoutReuseCount,
      averageCheckoutLatencyMs:
        this.checkoutGuidanceGenerations > 0
          ? Math.round(this.checkoutLatencyMs / this.checkoutGuidanceGenerations)
          : 0,
    });
  }
}

module.exports = AIMetrics;
