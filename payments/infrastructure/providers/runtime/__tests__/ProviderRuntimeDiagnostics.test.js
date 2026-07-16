const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createExecutionDecision } = require("../ExecutionDecision");
const { ProviderRuntimeDiagnosticsCollector } = require("../observability/ProviderRuntimeDiagnostics");
const { ExecutionTimelineRecorder } = require("../observability/ExecutionTimeline");

describe("ProviderRuntimeDiagnostics", () => {
  it("attaches execution decision and timeline", () => {
    const decision = createExecutionDecision({
      executionMode: "RUNTIME_SANDBOX",
      providerCode: "MTN_MOMO",
      adapter: null,
      descriptor: { code: "MTN_MOMO" },
      reason: "runtimeEnabled",
      fallbackAllowed: false,
    });

    const recorder = new ExecutionTimelineRecorder({
      executionId: "exec-1",
      correlationId: "corr-1",
      providerCode: "MTN_MOMO",
      executionMode: "RUNTIME_SANDBOX",
      clock: { now: () => 1000 },
    });
    recorder.recordStage("START");
    const timeline = recorder.complete();

    const collector = new ProviderRuntimeDiagnosticsCollector({ correlationId: "corr-1" });
    collector.attachExecutionDecision(decision);
    collector.attachExecutionTimeline(timeline);
    collector.incrementCounter("provider_success");
    collector.observeProviderDuration(42);

    const snapshot = collector.snapshot();
    assert.equal(snapshot.correlationId, "corr-1");
    assert.equal(snapshot.executionDecision.executionMode, "RUNTIME_SANDBOX");
    assert.equal(snapshot.executionTimeline.executionId, "exec-1");
    assert.equal(snapshot.counters.provider_success, 1);
    assert.equal(snapshot.counters.provider_duration, 42);
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.counters));
  });
});
