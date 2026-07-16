const { randomUUID } = require("node:crypto");
const { ProviderRuntimeMetrics } = require("./ProviderRuntimeMetrics");
const { createExecutionTimeline } = require("./ExecutionTimeline");

function createProviderRuntimeDiagnostics({
  correlationId = null,
  executionDecision = null,
  executionTimeline = null,
  counters = null,
} = {}) {
  return Object.freeze({
    correlationId: correlationId ? String(correlationId) : null,
    executionDecision: executionDecision || null,
    executionTimeline: executionTimeline || null,
    counters: counters || new ProviderRuntimeMetrics().snapshot(),
  });
}

/**
 * Passive in-memory diagnostics collector for a single request scope.
 */
class ProviderRuntimeDiagnosticsCollector {
  constructor({ correlationId = null, metrics = null } = {}) {
    this._correlationId = correlationId ? String(correlationId) : randomUUID();
    this._metrics = metrics || new ProviderRuntimeMetrics();
    this._executionDecision = null;
    this._executionTimeline = null;
  }

  get correlationId() {
    return this._correlationId;
  }

  attachExecutionDecision(executionDecision) {
    this._executionDecision = executionDecision ? Object.freeze({ ...executionDecision }) : null;
    return this.snapshot();
  }

  attachExecutionTimeline(executionTimeline) {
    if (executionTimeline && !executionTimeline.executionId) {
      throw new Error("ProviderRuntimeDiagnostics: executionTimeline.executionId is required");
    }
    this._executionTimeline = executionTimeline
      ? createExecutionTimeline(executionTimeline)
      : null;
    return this.snapshot();
  }

  incrementCounter(name, value = 1) {
    this._metrics.increment(name, value);
    return this.snapshot();
  }

  observeProviderDuration(durationMs) {
    this._metrics.observeDuration(durationMs);
    return this.snapshot();
  }

  snapshot() {
    return createProviderRuntimeDiagnostics({
      correlationId: this._correlationId,
      executionDecision: this._executionDecision,
      executionTimeline: this._executionTimeline,
      counters: this._metrics.snapshot(),
    });
  }
}

module.exports = {
  createProviderRuntimeDiagnostics,
  ProviderRuntimeDiagnosticsCollector,
};
