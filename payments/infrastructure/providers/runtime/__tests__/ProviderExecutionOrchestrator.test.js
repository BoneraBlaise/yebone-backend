const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ProviderExecutionOrchestrator = require("../ProviderExecutionOrchestrator");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const RuntimeExecutionGuardError = require("../errors/RuntimeExecutionGuardError");
const ProviderCapabilityError = require("../../errors/ProviderCapabilityError");
const { EXECUTION_TIMELINE_STAGES } = require("../observability/ExecutionTimeline");
const {
  createCombinedFoundation,
  enableMtnRuntime,
} = require("./runtimeTestHelpers");
const {
  createRoutingTransport,
  mtnMoMoSandboxRoutes,
} = require("./mockHttp");

describe("ProviderExecutionOrchestrator", () => {
  it("requires constructor injection for all dependencies", () => {
    assert.throws(
      () => new ProviderExecutionOrchestrator({}),
      /requires providerAdapterResolver/
    );
  });

  it("does not require or invoke RuntimeFactory", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "..", "ProviderExecutionOrchestrator.js"),
      "utf8"
    );
    assert.equal(/require\s*\(\s*['"]\.\/RuntimeFactory['"]\s*\)/.test(source), false);
    assert.equal(/RuntimeFactory\./.test(source), false);
  });
});

describe("ProviderExecutionOrchestrator operations", () => {
  let foundation;
  let orchestrator;

  beforeEach(() => {
    foundation = createCombinedFoundation();
    foundation.providerRegistry.enable("MTN_MOMO");
    foundation.featureFlags.enable("mtnEnabled");
    orchestrator = foundation.providerExecutionOrchestrator;
  });

  it("executes charge via MOCK skeleton fallback", async () => {
    const result = await orchestrator.charge(
      {
        providerCode: "MTN_MOMO",
        reference: "ord-100",
        amount: 5000,
        currency: "RWF",
        countryCode: "RW",
      },
      { correlationId: "corr-mock-charge" }
    );

    assert.equal(result.success, true);
    assert.equal(result.executionMode, "MOCK");
    assert.equal(result.providerResponse.mock, true);
    assert.equal(result.providerResponse.operation, "charge");
    assert.equal(result.correlationId, "corr-mock-charge");
    assert.ok(result.executionTimeline);
    assert.ok(result.diagnostics);
    assert.equal(result.executionDecision.reason, "runtimeSandboxDisabled");
    assert.equal(Object.isFrozen(result), true);
  });

  it("executes verify via MOCK skeleton fallback", async () => {
    const result = await orchestrator.verify(
      {
        providerCode: "MTN_MOMO",
        reference: "ord-100",
      },
      { correlationId: "corr-mock-verify" }
    );

    assert.equal(result.success, true);
    assert.equal(result.executionMode, "MOCK");
    assert.equal(result.providerResponse.operation, "verify");
  });

  it("executes payout via MOCK skeleton fallback", async () => {
    const result = await orchestrator.payout(
      {
        providerCode: "MTN_MOMO",
        reference: "pay-100",
        amount: 1000,
        currency: "RWF",
      },
      { correlationId: "corr-mock-payout" }
    );

    assert.equal(result.success, true);
    assert.equal(result.executionMode, "MOCK");
    assert.equal(result.providerResponse.operation, "payout");
  });

  it("executes refund via MOCK skeleton fallback", async () => {
    const result = await orchestrator.refund(
      {
        providerCode: "MTN_MOMO",
        reference: "ref-100",
        amount: 500,
        currency: "RWF",
      },
      { correlationId: "corr-mock-refund" }
    );

    assert.equal(result.success, true);
    assert.equal(result.executionMode, "MOCK");
    assert.equal(result.providerResponse.operation, "refund");
  });

  it("records execution timeline stages on MOCK path", async () => {
    const result = await orchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "ord-timeline",
      amount: 100,
      currency: "RWF",
    });

    const stages = result.executionTimeline.stages.map((entry) => entry.stage);
    assert.ok(stages.includes("START"));
    assert.ok(stages.includes("RESOLVE_PROVIDER"));
    assert.ok(stages.includes("NORMALIZE_RESPONSE"));
    assert.equal(result.executionTimeline.outcome, "COMPLETE");
    assert.equal(result.diagnostics.executionTimeline.outcome, "COMPLETE");
  });

  it("returns failure ExecutionResult when adapter is unavailable", async () => {
    const customOrchestrator = RuntimeFactory.createProviderExecutionOrchestrator({
      providerAdapterResolver: foundation.adapterResolver,
      runtimeAdapterResolver: {
        resolve() {
          return {
            executionMode: "MOCK",
            providerCode: "UNKNOWN",
            adapter: null,
            descriptor: { code: "UNKNOWN" },
            reason: "fallbackDefault",
            fallbackAllowed: true,
          };
        },
      },
      runtimeExecutionGuard: foundation.runtimeExecutionGuard,
      providerCapabilityValidator: foundation.capabilityValidator,
    });

    const result = await customOrchestrator.charge({ providerCode: "UNKNOWN" });

    assert.equal(result.success, false);
    assert.equal(result.executionTimeline.outcome, "ERROR");
  });

  it("returns failure ExecutionResult on capability rejection", async () => {
    const customOrchestrator = RuntimeFactory.createProviderExecutionOrchestrator({
      providerAdapterResolver: foundation.adapterResolver,
      runtimeAdapterResolver: foundation.runtimeAdapterResolver,
      runtimeExecutionGuard: foundation.runtimeExecutionGuard,
      providerCapabilityValidator: {
        validate() {
          throw new ProviderCapabilityError("MTN_MOMO", "charge", "PAYMENTS");
        },
      },
    });

    const result = await customOrchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "ord-cap",
      amount: 100,
      currency: "RWF",
    });

    assert.equal(result.success, false);
    assert.equal(result.executionTimeline.outcome, "ERROR");
    assert.equal(result.providerResponse.success, false);
  });

  it("returns failure ExecutionResult when runtime guard rejects", async () => {
    enableMtnRuntime(foundation);

    const customOrchestrator = RuntimeFactory.createProviderExecutionOrchestrator({
      providerAdapterResolver: foundation.adapterResolver,
      runtimeAdapterResolver: foundation.runtimeAdapterResolver,
      runtimeExecutionGuard: {
        assertExecutionAllowed() {},
        assertLiveExecutionPrevented() {},
        assertRuntimeEnabled() {
          throw new RuntimeExecutionGuardError("blocked", { code: "RUNTIME_SANDBOX_DISABLED" });
        },
        assertSandbox() {},
      },
      providerCapabilityValidator: foundation.capabilityValidator,
    });

    const result = await customOrchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "ord-guard",
      amount: 100,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(result.success, false);
    assert.equal(result.executionMode, "RUNTIME_SANDBOX");
    assert.equal(result.executionTimeline.outcome, "ERROR");
  });
});

describe("ProviderExecutionOrchestrator RUNTIME_SANDBOX", () => {
  it("executes charge via runtime adapter with mock transport", async () => {
    const env = {
      MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
      MTN_MOMO_API_USER: "api-user",
      MTN_MOMO_API_KEY: "api-key",
    };
    const transport = createRoutingTransport(mtnMoMoSandboxRoutes());
    const foundation = createCombinedFoundation({
      runtimeOptions: {
        providers: [new EnvironmentCredentialProvider({ env })],
        transport,
      },
    });
    enableMtnRuntime(foundation);

    const result = await foundation.providerExecutionOrchestrator.charge(
      {
        providerCode: "MTN_MOMO",
        reference: "ord-runtime",
        amount: 2500,
        currency: "RWF",
        metadata: { msisdn: "250788123456" },
      },
      { correlationId: "corr-runtime-charge" }
    );

    assert.equal(result.success, true);
    assert.equal(result.executionMode, "RUNTIME_SANDBOX");
    assert.equal(result.providerResponse.mock, false);
    assert.equal(result.providerResponse.status, "PENDING");

    const stages = result.executionTimeline.stages.map((entry) => entry.stage);
    for (const stage of [
      "START",
      "RESOLVE_PROVIDER",
      "AUTHENTICATE",
      "REQUEST_SIGNING",
      "HTTP_REQUEST",
      "HTTP_RESPONSE",
      "NORMALIZE_RESPONSE",
      "COMPLETE",
    ]) {
      assert.ok(stages.includes(stage), `missing stage ${stage}`);
    }
    assert.ok(EXECUTION_TIMELINE_STAGES.includes("ERROR"));
  });

  it("executes verify and refund on runtime path", async () => {
    const env = {
      MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
      MTN_MOMO_API_USER: "api-user",
      MTN_MOMO_API_KEY: "api-key",
    };
    const transport = createRoutingTransport(mtnMoMoSandboxRoutes());
    const foundation = createCombinedFoundation({
      runtimeOptions: {
        providers: [new EnvironmentCredentialProvider({ env })],
        transport,
      },
    });
    enableMtnRuntime(foundation);
    const orchestrator = foundation.providerExecutionOrchestrator;

    await orchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "ord-runtime-verify",
      amount: 2500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    const verifyResult = await orchestrator.verify({
      providerCode: "MTN_MOMO",
      reference: "ord-runtime-verify",
      metadata: { providerReference: "ord-runtime-verify" },
    });
    assert.equal(verifyResult.success, true);
    assert.equal(verifyResult.executionMode, "RUNTIME_SANDBOX");

    const refundResult = await orchestrator.refund({
      providerCode: "MTN_MOMO",
      reference: "ord-runtime-verify",
      amount: 2500,
      currency: "RWF",
    });
    assert.equal(refundResult.executionMode, "RUNTIME_SANDBOX");
    assert.equal(refundResult.success, false);
    assert.equal(refundResult.providerResponse.success, false);
  });
});

describe("RuntimeFactory.createProviderExecutionOrchestrator", () => {
  it("composes orchestrator from injected dependencies", () => {
    const foundation = createCombinedFoundation();
    const orchestrator = RuntimeFactory.createProviderExecutionOrchestrator({
      providerAdapterResolver: foundation.adapterResolver,
      runtimeAdapterResolver: foundation.runtimeAdapterResolver,
      runtimeExecutionGuard: foundation.runtimeExecutionGuard,
      providerCapabilityValidator: foundation.capabilityValidator,
    });

    assert.ok(orchestrator instanceof ProviderExecutionOrchestrator);
  });
});
