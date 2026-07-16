const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const CorrelationContext = require("../observability/CorrelationContext");
const { ProviderRuntimeDiagnosticsCollector } = require("../observability/ProviderRuntimeDiagnostics");
const ProviderResponseNormalizer = require("../ProviderResponseNormalizer");
const RuntimeConfig = require("../RuntimeConfig");

describe("CorrelationContext", () => {
  it("propagates correlation through HTTP headers", () => {
    const context = new CorrelationContext({ correlationId: "corr-http", executionId: "exec-http" });
    const request = context.propagateToHttpRequest({ method: "POST", url: "https://example.test" });
    assert.equal(request.correlationId, "corr-http");
    assert.equal(request.headers[RuntimeConfig.correlationHeader], "corr-http");
  });

  it("propagates correlation through normalizer input", () => {
    const context = new CorrelationContext({ correlationId: "corr-norm" });
    const normalizer = new ProviderResponseNormalizer("MTN_MOMO");
    const normalized = normalizer.normalizeCharge(
      context.propagateToNormalizerInput({ success: true, status: "SUCCEEDED" })
    );
    assert.equal(normalized.metadata.correlationId, "corr-norm");
  });

  it("propagates correlation through diagnostics and timeline", () => {
    const context = new CorrelationContext({ correlationId: "corr-diag", executionId: "exec-diag" });
    const collector = new ProviderRuntimeDiagnosticsCollector({ correlationId: "other" });
    const diagnostics = context.propagateToDiagnostics(collector);
    assert.equal(diagnostics.correlationId, "corr-diag");

    const recorder = context.createTimelineRecorder({
      providerCode: "PAYPACK",
      executionMode: "RUNTIME_SANDBOX",
      clock: { now: () => 1000 },
    });
    const timeline = recorder.recordStage("START");
    assert.equal(timeline.correlationId, "corr-diag");
    assert.equal(timeline.executionId, "exec-diag");
  });
});
