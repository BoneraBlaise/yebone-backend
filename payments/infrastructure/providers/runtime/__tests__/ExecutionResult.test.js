const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createExecutionResult,
  EXECUTION_RESULT_MODES,
} = require("../ExecutionResult");
const { createExecutionDecision } = require("../ExecutionDecision");
const ProviderResponse = require("../../models/ProviderResponse");

describe("ExecutionResult", () => {
  const baseDecision = createExecutionDecision({
    executionMode: "MOCK",
    providerCode: "MTN_MOMO",
    adapter: null,
    descriptor: { code: "MTN_MOMO" },
    reason: "providerFlagDisabled",
    fallbackAllowed: true,
  });

  it("creates immutable success results with required fields", () => {
    const providerResponse = ProviderResponse.mock({
      providerCode: "MTN_MOMO",
      operation: "charge",
      reference: "ord-1",
    });

    const result = createExecutionResult({
      success: true,
      providerResponse,
      executionDecision: baseDecision,
      executionMode: "MOCK",
      correlationId: "corr-1",
    });

    assert.equal(result.success, true);
    assert.equal(result.providerResponse.success, true);
    assert.equal(result.executionDecision.executionMode, "MOCK");
    assert.equal(result.executionMode, "MOCK");
    assert.equal(result.correlationId, "corr-1");
    assert.equal(result.executionTimeline, null);
    assert.equal(result.diagnostics, null);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.executionDecision), true);
  });

  it("creates failure results without throwing", () => {
    const result = createExecutionResult({
      success: false,
      providerResponse: ProviderResponse.failure(new Error("guard rejected")),
      executionDecision: baseDecision,
      executionMode: "MOCK",
      correlationId: "corr-2",
    });

    assert.equal(result.success, false);
    assert.equal(result.providerResponse.success, false);
  });

  it("rejects invalid execution modes and missing fields", () => {
    assert.throws(
      () =>
        createExecutionResult({
          success: true,
          executionDecision: baseDecision,
          executionMode: "LIVE",
          correlationId: "corr-3",
        }),
      /invalid executionMode/
    );

    assert.throws(
      () =>
        createExecutionResult({
          success: "yes",
          executionDecision: baseDecision,
          executionMode: "MOCK",
          correlationId: "corr-4",
        }),
      /success must be a boolean/
    );

    assert.throws(
      () =>
        createExecutionResult({
          success: false,
          executionMode: "MOCK",
          correlationId: "corr-5",
        }),
      /executionDecision is required/
    );
  });

  it("exports execution result modes", () => {
    assert.ok(EXECUTION_RESULT_MODES.includes("MOCK"));
    assert.ok(EXECUTION_RESULT_MODES.includes("RUNTIME_SANDBOX"));
  });
});
