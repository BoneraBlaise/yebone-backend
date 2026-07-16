const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  EXECUTION_TIMELINE_STAGES,
  createExecutionTimeline,
  ExecutionTimelineRecorder,
} = require("../observability/ExecutionTimeline");

describe("ExecutionTimeline", () => {
  it("creates immutable timeline metadata", () => {
    const timeline = createExecutionTimeline({
      executionId: "exec-1",
      correlationId: "corr-1",
      providerCode: "MTN_MOMO",
      executionMode: "RUNTIME_SANDBOX",
      operation: "charge",
      decisionReason: "runtimeEnabled",
      fallbackAllowed: false,
      stages: [{ stage: "START", at: "2026-01-01T00:00:00.000Z", durationMs: null }],
      totalDurationMs: 10,
      outcome: "COMPLETE",
    });

    assert.equal(timeline.executionId, "exec-1");
    assert.equal(timeline.correlationId, "corr-1");
    assert.equal(timeline.providerCode, "MTN_MOMO");
    assert.equal(timeline.executionMode, "RUNTIME_SANDBOX");
    assert.equal(timeline.outcome, "COMPLETE");
    assert.ok(Object.isFrozen(timeline));
  });

  it("records ordered stages and closes as read-only", () => {
    let now = 1000;
    const recorder = new ExecutionTimelineRecorder({
      executionId: "exec-2",
      correlationId: "corr-2",
      providerCode: "PAYPACK",
      executionMode: "RUNTIME_SANDBOX",
      operation: "verify",
      clock: { now: () => now++ },
    });

    recorder.recordStage("START");
    recorder.recordStage("AUTHENTICATE");
    recorder.recordStage("HTTP_REQUEST");
    const timeline = recorder.complete();

    assert.equal(timeline.stages.length, 4);
    assert.equal(timeline.stages[0].stage, "START");
    assert.equal(timeline.stages.at(-1).stage, "COMPLETE");
    assert.equal(timeline.outcome, "COMPLETE");
    assert.throws(() => recorder.recordStage("HTTP_RESPONSE"));
  });

  it("supports ERROR terminal stage", () => {
    const recorder = new ExecutionTimelineRecorder({
      executionId: "exec-3",
      correlationId: "corr-3",
      providerCode: "MTN_MOMO",
      executionMode: "MOCK",
      clock: { now: () => 5000 },
    });

    recorder.recordStage("START");
    const timeline = recorder.fail();
    assert.equal(timeline.outcome, "ERROR");
    assert.equal(timeline.stages.at(-1).stage, "ERROR");
  });

  it("exposes all required stages", () => {
    assert.ok(EXECUTION_TIMELINE_STAGES.includes("RESOLVE_PROVIDER"));
    assert.ok(EXECUTION_TIMELINE_STAGES.includes("NORMALIZE_RESPONSE"));
  });
});
