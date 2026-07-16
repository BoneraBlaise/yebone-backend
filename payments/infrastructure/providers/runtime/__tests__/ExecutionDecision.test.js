const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createExecutionDecision,
  EXECUTION_MODES,
  DECISION_REASONS,
} = require("../ExecutionDecision");

describe("ExecutionDecision", () => {
  it("creates immutable MOCK decisions with fallbackAllowed=true", () => {
    const decision = createExecutionDecision({
      executionMode: "MOCK",
      providerCode: "MTN_MOMO",
      adapter: { providerCode: "MTN_MOMO" },
      descriptor: { code: "MTN_MOMO", enabled: false },
      reason: "runtimeSandboxDisabled",
      fallbackAllowed: true,
    });

    assert.equal(decision.executionMode, "MOCK");
    assert.equal(decision.reason, "runtimeSandboxDisabled");
    assert.equal(decision.fallbackAllowed, true);
    assert.equal(Object.isFrozen(decision), true);
    assert.equal(Object.isFrozen(decision.descriptor), true);
  });

  it("creates immutable RUNTIME_SANDBOX decisions with fallbackAllowed=false", () => {
    const decision = createExecutionDecision({
      executionMode: "RUNTIME_SANDBOX",
      providerCode: "MTN_MOMO",
      adapter: { providerCode: "MTN_MOMO" },
      descriptor: { code: "MTN_MOMO", enabled: true },
      reason: "runtimeEnabled",
      fallbackAllowed: false,
    });

    assert.equal(decision.executionMode, "RUNTIME_SANDBOX");
    assert.equal(decision.fallbackAllowed, false);
  });

  it("rejects invalid execution modes and reasons", () => {
    assert.throws(
      () =>
        createExecutionDecision({
          executionMode: "LIVE",
          providerCode: "MTN_MOMO",
          adapter: null,
          descriptor: { code: "MTN_MOMO" },
          reason: "runtimeEnabled",
          fallbackAllowed: false,
        }),
      /invalid executionMode/
    );

    assert.throws(
      () =>
        createExecutionDecision({
          executionMode: "MOCK",
          providerCode: "MTN_MOMO",
          adapter: null,
          descriptor: { code: "MTN_MOMO" },
          reason: "unknownReason",
          fallbackAllowed: true,
        }),
      /invalid reason/
    );
  });

  it("enforces fallbackAllowed policy by execution mode", () => {
    assert.throws(
      () =>
        createExecutionDecision({
          executionMode: "MOCK",
          providerCode: "MTN_MOMO",
          adapter: null,
          descriptor: { code: "MTN_MOMO" },
          reason: "fallbackDefault",
          fallbackAllowed: false,
        }),
      /MOCK requires fallbackAllowed=true/
    );

    assert.throws(
      () =>
        createExecutionDecision({
          executionMode: "RUNTIME_SANDBOX",
          providerCode: "MTN_MOMO",
          adapter: {},
          descriptor: { code: "MTN_MOMO" },
          reason: "runtimeEnabled",
          fallbackAllowed: true,
        }),
      /RUNTIME_SANDBOX requires fallbackAllowed=false/
    );
  });

  it("exports execution mode and reason constants", () => {
    assert.ok(EXECUTION_MODES.includes("MOCK"));
    assert.ok(DECISION_REASONS.includes("runtimeEnabled"));
  });
});
