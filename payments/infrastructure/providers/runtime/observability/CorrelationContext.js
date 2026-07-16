const { randomUUID } = require("node:crypto");
const RuntimeConfig = require("../RuntimeConfig");

/**
 * Correlation propagation helper for HTTP, OAuth, normalizer, diagnostics, and timeline.
 */
class CorrelationContext {
  constructor({ correlationId = null, executionId = null } = {}) {
    this.correlationId = correlationId ? String(correlationId) : randomUUID();
    this.executionId = executionId ? String(executionId) : randomUUID();
    return Object.freeze(this);
  }

  propagateToHeaders(headers = {}) {
    return Object.freeze({
      ...headers,
      [RuntimeConfig.correlationHeader]: this.correlationId,
    });
  }

  propagateToHttpRequest(request = {}) {
    return Object.freeze({
      ...request,
      correlationId: request.correlationId || this.correlationId,
      headers: this.propagateToHeaders(request.headers || {}),
    });
  }

  propagateToNormalizerInput(input = {}) {
    return Object.freeze({
      ...input,
      correlationId: input.correlationId || this.correlationId,
    });
  }

  propagateToDiagnostics(collector) {
    if (!collector || typeof collector.snapshot !== "function") {
      throw new Error("CorrelationContext: diagnostics collector is required");
    }
    if (collector.correlationId === this.correlationId) {
      return collector.snapshot();
    }
    return createDiagnosticsWithCorrelation(collector, this.correlationId);
  }

  createTimelineRecorder(timelineOptions = {}) {
    const { ExecutionTimelineRecorder } = require("./ExecutionTimeline");
    return new ExecutionTimelineRecorder({
      executionId: this.executionId,
      correlationId: this.correlationId,
      ...timelineOptions,
    });
  }
}

function createDiagnosticsWithCorrelation(collector, correlationId) {
  const { ProviderRuntimeDiagnosticsCollector } = require("./ProviderRuntimeDiagnostics");
  const replacement = new ProviderRuntimeDiagnosticsCollector({ correlationId });
  const current = collector.snapshot();
  if (current.executionDecision) {
    replacement.attachExecutionDecision(current.executionDecision);
  }
  if (current.executionTimeline) {
    replacement.attachExecutionTimeline(current.executionTimeline);
  }
  for (const [name, value] of Object.entries(current.counters || {})) {
    if (value > 0) {
      replacement.incrementCounter(name, value);
    }
  }
  return replacement.snapshot();
}

module.exports = CorrelationContext;
