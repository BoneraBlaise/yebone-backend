const EXECUTION_MODES = Object.freeze(["MOCK", "RUNTIME_SANDBOX"]);

const DECISION_REASONS = Object.freeze([
  "runtimeEnabled",
  "runtimeSandboxDisabled",
  "providerRuntimeDisabled",
  "runtimeNotRegistered",
  "environmentNotSandbox",
  "providerFlagDisabled",
  "registryDisabled",
  "fallbackDefault",
]);

/**
 * Immutable execution decision record — constructed only via createExecutionDecision.
 */
function createExecutionDecision({
  executionMode,
  providerCode,
  adapter,
  descriptor,
  reason,
  fallbackAllowed,
}) {
  const mode = String(executionMode || "").trim();
  const code = String(providerCode || "").trim().toUpperCase();
  const decisionReason = String(reason || "").trim();

  if (!EXECUTION_MODES.includes(mode)) {
    throw new Error(`ExecutionDecision: invalid executionMode "${executionMode}"`);
  }
  if (!code) {
    throw new Error("ExecutionDecision: providerCode is required");
  }
  if (!DECISION_REASONS.includes(decisionReason)) {
    throw new Error(`ExecutionDecision: invalid reason "${reason}"`);
  }
  if (typeof fallbackAllowed !== "boolean") {
    throw new Error("ExecutionDecision: fallbackAllowed must be a boolean");
  }

  const expectedFallback = mode === "MOCK";
  if (fallbackAllowed !== expectedFallback && mode === "RUNTIME_SANDBOX" && fallbackAllowed !== false) {
    throw new Error("ExecutionDecision: RUNTIME_SANDBOX requires fallbackAllowed=false");
  }
  if (mode === "MOCK" && fallbackAllowed !== true) {
    throw new Error("ExecutionDecision: MOCK requires fallbackAllowed=true");
  }

  return Object.freeze({
    executionMode: mode,
    providerCode: code,
    adapter: adapter ?? null,
    descriptor: Object.freeze(descriptor ? { ...descriptor } : { code }),
    reason: decisionReason,
    fallbackAllowed,
  });
}

module.exports = {
  createExecutionDecision,
  EXECUTION_MODES,
  DECISION_REASONS,
};
