const EXECUTION_TIMELINE_STAGES = Object.freeze([
  "START",
  "RESOLVE_PROVIDER",
  "AUTHENTICATE",
  "REQUEST_SIGNING",
  "HTTP_REQUEST",
  "HTTP_RESPONSE",
  "NORMALIZE_RESPONSE",
  "COMPLETE",
  "ERROR",
]);

const TERMINAL_STAGES = Object.freeze(["COMPLETE", "ERROR"]);

function createExecutionTimeline({
  executionId,
  correlationId,
  providerCode,
  executionMode,
  operation = null,
  decisionReason = null,
  fallbackAllowed = null,
  stages = [],
  totalDurationMs = null,
  outcome = null,
} = {}) {
  if (!executionId) {
    throw new Error("ExecutionTimeline: executionId is required");
  }
  if (!correlationId) {
    throw new Error("ExecutionTimeline: correlationId is required");
  }
  if (!providerCode) {
    throw new Error("ExecutionTimeline: providerCode is required");
  }
  if (!executionMode) {
    throw new Error("ExecutionTimeline: executionMode is required");
  }

  const frozenStages = Object.freeze(
    stages.map((entry) =>
      Object.freeze({
        stage: entry.stage,
        at: entry.at,
        durationMs: entry.durationMs ?? null,
      })
    )
  );

  return Object.freeze({
    executionId: String(executionId),
    correlationId: String(correlationId),
    providerCode: String(providerCode).trim().toUpperCase(),
    executionMode: String(executionMode),
    operation: operation ? String(operation) : null,
    decisionReason: decisionReason ? String(decisionReason) : null,
    fallbackAllowed: typeof fallbackAllowed === "boolean" ? fallbackAllowed : null,
    stages: frozenStages,
    totalDurationMs: totalDurationMs ?? null,
    outcome: outcome ? String(outcome) : null,
  });
}

/**
 * Append-only recorder producing immutable timeline snapshots.
 */
class ExecutionTimelineRecorder {
  constructor({
    executionId,
    correlationId,
    providerCode,
    executionMode,
    operation = null,
    decisionReason = null,
    fallbackAllowed = null,
    clock = Date,
  } = {}) {
    this.executionId = executionId;
    this.correlationId = correlationId;
    this.providerCode = providerCode;
    this.executionMode = executionMode;
    this.operation = operation;
    this.decisionReason = decisionReason;
    this.fallbackAllowed = fallbackAllowed;
    this.clock = clock;
    this._startedAtMs = clock.now();
    this._lastStageAtMs = this._startedAtMs;
    this._stages = [];
    this._outcome = null;
    this._closed = false;
  }

  snapshot() {
    return createExecutionTimeline({
      executionId: this.executionId,
      correlationId: this.correlationId,
      providerCode: this.providerCode,
      executionMode: this.executionMode,
      operation: this.operation,
      decisionReason: this.decisionReason,
      fallbackAllowed: this.fallbackAllowed,
      stages: this._stages,
      totalDurationMs: this._closed ? this.clock.now() - this._startedAtMs : null,
      outcome: this._outcome,
    });
  }

  recordStage(stage) {
    this._assertOpen();
    const normalizedStage = String(stage || "").trim().toUpperCase();
    if (!EXECUTION_TIMELINE_STAGES.includes(normalizedStage)) {
      throw new Error(`ExecutionTimeline: invalid stage "${stage}"`);
    }
    if (TERMINAL_STAGES.includes(normalizedStage)) {
      throw new Error(`ExecutionTimeline: use complete() or fail() for terminal stage "${normalizedStage}"`);
    }

    const nowMs = this.clock.now();
    this._stages.push(
      Object.freeze({
        stage: normalizedStage,
        at: new Date(nowMs).toISOString(),
        durationMs: nowMs - this._lastStageAtMs,
      })
    );
    this._lastStageAtMs = nowMs;
    return this.snapshot();
  }

  complete() {
    return this._close("COMPLETE");
  }

  fail() {
    return this._close("ERROR");
  }

  _close(outcome) {
    this._assertOpen();
    const nowMs = this.clock.now();
    this._stages.push(
      Object.freeze({
        stage: outcome,
        at: new Date(nowMs).toISOString(),
        durationMs: nowMs - this._lastStageAtMs,
      })
    );
    this._outcome = outcome;
    this._closed = true;
    return this.snapshot();
  }

  _assertOpen() {
    if (this._closed) {
      throw new Error("ExecutionTimeline: timeline is closed");
    }
  }
}

module.exports = {
  EXECUTION_TIMELINE_STAGES,
  createExecutionTimeline,
  ExecutionTimelineRecorder,
};
