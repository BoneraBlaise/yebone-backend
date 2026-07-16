const EXECUTION_RESULT_MODES = Object.freeze(["MOCK", "RUNTIME_SANDBOX"]);

/**
 * Immutable public boundary object returned by ProviderExecutionOrchestrator.
 * PaymentEngine must read success and providerResponse only — not runtime internals.
 */
function createExecutionResult({
  success,
  providerResponse = null,
  executionDecision,
  executionTimeline = null,
  diagnostics = null,
  executionMode,
  correlationId,
} = {}) {
  if (typeof success !== "boolean") {
    throw new Error("ExecutionResult: success must be a boolean");
  }
  if (!executionDecision) {
    throw new Error("ExecutionResult: executionDecision is required");
  }
  if (!correlationId) {
    throw new Error("ExecutionResult: correlationId is required");
  }

  const mode = String(executionMode || executionDecision.executionMode || "").trim();
  if (!EXECUTION_RESULT_MODES.includes(mode)) {
    throw new Error(`ExecutionResult: invalid executionMode "${executionMode}"`);
  }

  return Object.freeze({
    success,
    providerResponse: providerResponse ?? null,
    executionDecision: Object.freeze({ ...executionDecision }),
    executionTimeline: executionTimeline ?? null,
    diagnostics: diagnostics ?? null,
    executionMode: mode,
    correlationId: String(correlationId),
  });
}

module.exports = {
  createExecutionResult,
  EXECUTION_RESULT_MODES,
};
