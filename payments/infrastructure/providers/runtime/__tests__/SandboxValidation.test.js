const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const {
  createCombinedFoundation,
  enableMtnRuntime,
} = require("./runtimeTestHelpers");
const {
  createRoutingTransport,
  mtnMoMoSandboxRoutes,
  paypackSandboxRoutes,
} = require("./mockHttp");

describe("Runtime observability wiring", () => {
  it("records runtime_mock and provider_success on MOCK orchestrator path", async () => {
    const foundation = createCombinedFoundation();
    foundation.providerRegistry.enable("MTN_MOMO");
    foundation.featureFlags.enable("mtnEnabled");

    const result = await foundation.providerExecutionOrchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "obs-mock-1",
      amount: 1000,
      currency: "RWF",
    });

    assert.equal(result.diagnostics.counters.runtime_mock, 1);
    assert.equal(result.diagnostics.counters.provider_success, 1);
    assert.ok(result.diagnostics.counters.provider_duration >= 0);
    assert.equal(result.executionTimeline.outcome, "COMPLETE");
    assert.equal(result.diagnostics.executionDecision.executionMode, "MOCK");
  });

  it("records runtime_http, oauth_cache_miss, and provider_success on RUNTIME_SANDBOX path", async () => {
    const env = {
      MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
      MTN_MOMO_API_USER: "api-user",
      MTN_MOMO_API_KEY: "api-key",
    };
    const foundation = createCombinedFoundation({
      runtimeOptions: {
        providers: [new EnvironmentCredentialProvider({ env })],
        transport: createRoutingTransport(mtnMoMoSandboxRoutes()),
      },
    });
    enableMtnRuntime(foundation);

    const result = await foundation.providerExecutionOrchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "obs-runtime-1",
      amount: 2500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(result.executionMode, "RUNTIME_SANDBOX");
    assert.equal(result.diagnostics.counters.provider_success, 1);
    assert.equal(result.diagnostics.counters.runtime_http >= 1, true);
    assert.equal(result.diagnostics.counters.oauth_cache_miss >= 1, true);
    assert.ok(result.diagnostics.executionTimeline);
    assert.equal(result.diagnostics.executionDecision.reason, "runtimeEnabled");
  });

  it("redacts diagnostics snapshots on ExecutionResult", async () => {
    const foundation = createCombinedFoundation();
    foundation.providerRegistry.enable("MTN_MOMO");
    foundation.featureFlags.enable("mtnEnabled");

    const result = await foundation.providerExecutionOrchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "obs-redact-1",
      amount: 500,
      currency: "RWF",
    });

    assert.ok(result.diagnostics);
    assert.equal(typeof result.diagnostics.correlationId, "string");
    assert.equal(Object.isFrozen(result.diagnostics), true);
  });

  it("increments provider_retry on HTTP client retries", async () => {
    let attempts = 0;
    const transport = async () => {
      attempts += 1;
      if (attempts === 1) {
        return { status: 503, headers: {}, body: { message: "retry" } };
      }
      return {
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token: "token-1", expires_in: 3600 }),
      };
    };

    const { ProviderRuntimeDiagnosticsCollector } = require("../observability/ProviderRuntimeDiagnostics");
    const diagnostics = new ProviderRuntimeDiagnosticsCollector({ correlationId: "retry-test" });
    const httpClient = RuntimeFactory.createHttpClient({ transport });

    await httpClient.request({
      providerCode: "MTN_MOMO",
      operation: "oauth",
      method: "POST",
      url: "https://sandbox.momodeveloper.mtn.com/collection/token/",
      metrics: diagnostics,
    });

    assert.equal(diagnostics.snapshot().counters.provider_retry, 1);
    assert.equal(diagnostics.snapshot().counters.runtime_http, 1);
  });
});

describe("SandboxValidation E2E (mock transport)", () => {
  const mtnEnv = {
    MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
    MTN_MOMO_API_USER: "api-user",
    MTN_MOMO_API_KEY: "api-key",
    MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY: "disb-sub",
    MTN_MOMO_DISBURSEMENT_API_USER: "disb-user",
    MTN_MOMO_DISBURSEMENT_API_KEY: "disb-key",
  };

  const paypackEnv = {
    PAYPACK_CLIENT_ID: "client-id",
    PAYPACK_CLIENT_SECRET: "client-secret",
  };

  it("validates MTN charge, verify, and payout via orchestrator", async () => {
    const foundation = createCombinedFoundation({
      runtimeOptions: {
        providers: [new EnvironmentCredentialProvider({ env: mtnEnv })],
        transport: createRoutingTransport(mtnMoMoSandboxRoutes()),
      },
    });
    enableMtnRuntime(foundation);

    const charge = await foundation.providerExecutionOrchestrator.charge({
      providerCode: "MTN_MOMO",
      reference: "e2e-mtn-charge",
      amount: 1500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });
    assert.equal(charge.success, true);

    const verify = await foundation.providerExecutionOrchestrator.verify({
      providerCode: "MTN_MOMO",
      reference: "e2e-mtn-charge",
      metadata: { providerReference: charge.providerResponse.externalReference || "order-100" },
    });
    assert.equal(verify.success, true);

    const payout = await foundation.providerExecutionOrchestrator.payout({
      providerCode: "MTN_MOMO",
      reference: "e2e-mtn-payout",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "250788654321" },
    });
    assert.equal(payout.success, true);
  });

  it("validates Paypack checkout, cash-in, cash-out, and verify via orchestrator", async () => {
    const foundation = createCombinedFoundation({
      runtimeOptions: {
        providers: [new EnvironmentCredentialProvider({ env: paypackEnv })],
        transport: createRoutingTransport(paypackSandboxRoutes()),
      },
    });
    foundation.providerRegistry.enable("PAYPACK");
    foundation.featureFlags.enable("paypackEnabled");
    foundation.runtimeFeatureFlags.enable("runtimeSandboxEnabled");
    foundation.runtimeFeatureFlags.enable("paypackRuntimeEnabled");

    const checkout = await foundation.providerExecutionOrchestrator.charge({
      providerCode: "PAYPACK",
      reference: "e2e-paypack-checkout",
      amount: 2000,
      currency: "RWF",
      metadata: { useCheckout: true, email: "buyer@example.com", appId: "app-1" },
    });
    assert.equal(checkout.success, true);

    const cashin = await foundation.providerExecutionOrchestrator.charge({
      providerCode: "PAYPACK",
      reference: "e2e-paypack-cashin",
      amount: 1500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });
    assert.equal(cashin.success, true);

    const cashout = await foundation.providerExecutionOrchestrator.payout({
      providerCode: "PAYPACK",
      reference: "e2e-paypack-cashout",
      amount: 800,
      currency: "RWF",
      metadata: { msisdn: "250788654321" },
    });
    assert.equal(cashout.success, true);

    const verify = await foundation.providerExecutionOrchestrator.verify({
      providerCode: "PAYPACK",
      reference: "e2e-paypack-cashin",
      metadata: { providerReference: "paypack-txn-123" },
    });
    assert.equal(verify.success, true);
  });
});
