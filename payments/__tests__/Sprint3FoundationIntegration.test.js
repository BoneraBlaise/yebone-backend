const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createPaymentFoundation } = require("../PaymentFoundationBootstrap");
const PaymentModule = require("../PaymentModule");
const FeatureFlagRolloutSupport = require("../infrastructure/engine/FeatureFlagRolloutSupport");
const EnvironmentCredentialProvider = require("../infrastructure/providers/runtime/credentials/EnvironmentCredentialProvider");
const {
  createRoutingTransport,
  mtnMoMoSandboxRoutes,
} = require("../infrastructure/providers/runtime/__tests__/mockHttp");

function createMemoryFoundationServices() {
  const idempotencyStore = new Map();
  const transactionRecords = [];
  const auditRecords = [];

  const idempotencyService = {
    fingerprint: (payload) => JSON.stringify(payload),
    async execute(key, payload, handler) {
      if (idempotencyStore.has(key)) {
        return idempotencyStore.get(key);
      }
      const result = await handler();
      idempotencyStore.set(key, result);
      return result;
    },
  };

  const transactionService = {
    async createTransaction(input) {
      const record = {
        transactionId: `txn_s3_${transactionRecords.length + 1}`,
        paymentReference: input.paymentReference || `ref_${transactionRecords.length + 1}`,
        status: "CREATED",
        ...input,
      };
      transactionRecords.push(record);
      return record;
    },
  };

  const auditService = {
    async record(event) {
      auditRecords.push(event);
      return Object.freeze({ ...event });
    },
  };

  return {
    idempotency: { service: idempotencyService, repository: {}, cleanup: {} },
    transactions: { service: transactionService, repository: {} },
    audit: { service: auditService, repository: {} },
    auditRecords,
    transactionRecords,
  };
}

function createTestFoundation(runtimeOptions = {}) {
  const memory = createMemoryFoundationServices();
  return {
    memory,
    foundation: createPaymentFoundation({
      engineOptions: {
        idempotency: memory.idempotency,
        transactions: memory.transactions,
        audit: memory.audit,
      },
      runtimeOptions,
    }),
  };
}

function enableMockPath(foundation) {
  foundation.providerFoundation.providerRegistry.enable("MTN_MOMO");
  foundation.featureFlags.enable("paymentEngineEnabled");
  foundation.featureFlags.enable("mtnEnabled");
}

function enableMtnRuntime(foundation) {
  enableMockPath(foundation);
  foundation.runtimeFeatureFlags.enable("runtimeSandboxEnabled");
  foundation.runtimeFeatureFlags.enable("mtnRuntimeEnabled");
}

describe("PaymentFoundationBootstrap", () => {
  it("composes provider, runtime, engine, and webhook service", () => {
    const { foundation } = createTestFoundation();
    assert.ok(foundation.engine);
    assert.ok(foundation.providerExecutionOrchestrator);
    assert.ok(foundation.webhookService);
    assert.ok(foundation.runtimeAdapterResolver);
    assert.equal(foundation.featureFlags.isEnabled("paymentEngineEnabled"), false);
    assert.equal(foundation.runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled"), false);
  });

  it("wires orchestrator into PaymentEngine via bootstrap", () => {
    const { foundation } = createTestFoundation();
    assert.equal(foundation.engine.providerExecutionOrchestrator, foundation.providerExecutionOrchestrator);
  });
});

describe("PaymentModule foundation wiring", () => {
  it("preserves legacy behavior when foundation is not injected", async () => {
    const module = new PaymentModule();
    assert.equal(module.isPaymentFoundationWired(), false);
    assert.equal(module.getPaymentEngine(), null);
    assert.equal(module.getPaymentService(), module.paymentService);
    assert.equal(await module.executeFoundationCharge({}, {}), null);
  });

  it("optionally wires PaymentEngine and orchestrator via paymentFoundation", () => {
    const { foundation } = createTestFoundation();
    const module = new PaymentModule({ paymentFoundation: foundation });
    assert.equal(module.isPaymentFoundationWired(), true);
    assert.equal(module.getPaymentEngine(), foundation.engine);
    assert.equal(module.getProviderExecutionOrchestrator(), foundation.providerExecutionOrchestrator);
    assert.ok(module.getWebhookVerificationService());
  });
});

describe("Sprint 3 end-to-end execution flow", () => {
  it("PaymentEngine → Orchestrator → MOCK adapter → PaymentModule result", async () => {
    const { foundation } = createTestFoundation();
    enableMockPath(foundation);
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.executeFoundationCharge(
      {
        orderId: "ord-s3-1",
        buyerId: "buyer-1",
        amount: 1500,
        providerCode: "MTN_MOMO",
        countryCode: "RW",
      },
      { correlationId: "corr-s3-1" }
    );

    assert.equal(result.status, "CREATED");
    assert.ok(result.providerExecution);
    assert.equal(result.providerExecution.success, true);
    assert.equal(result.providerExecution.executionMode, "MOCK");
    assert.equal(result.correlationId, "corr-s3-1");
  });

  it("PaymentEngine → Orchestrator → RUNTIME_SANDBOX adapter with feature flags", async () => {
    const env = {
      MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
      MTN_MOMO_API_USER: "api-user",
      MTN_MOMO_API_KEY: "api-key",
    };
    const { foundation } = createTestFoundation({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport: createRoutingTransport(mtnMoMoSandboxRoutes()),
    });
    enableMtnRuntime(foundation);
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.executeFoundationCharge({
      orderId: "ord-s3-runtime",
      buyerId: "buyer-1",
      amount: 2000,
      providerCode: "MTN_MOMO",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(result.providerExecution.executionMode, "RUNTIME_SANDBOX");
    assert.equal(result.providerExecution.success, true);
  });

  it("rejects charge when provider flag is disabled at engine resolver", async () => {
    const { foundation } = createTestFoundation();
    foundation.featureFlags.enable("paymentEngineEnabled");
    foundation.providerFoundation.providerRegistry.enable("MTN_MOMO");
    const module = new PaymentModule({ paymentFoundation: foundation });

    await assert.rejects(
      () =>
        module.executeFoundationCharge({
          orderId: "ord-flag-off",
          buyerId: "buyer-1",
          amount: 1000,
          providerCode: "MTN_MOMO",
        }),
      /disabled/i
    );
  });

  it("falls back to MOCK when runtime sandbox flag is disabled", async () => {
    const { foundation } = createTestFoundation();
    foundation.featureFlags.enable("paymentEngineEnabled");
    foundation.featureFlags.enable("mtnEnabled");
    foundation.providerFoundation.providerRegistry.enable("MTN_MOMO");
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.executeFoundationCharge({
      orderId: "ord-runtime-off",
      buyerId: "buyer-1",
      amount: 1000,
      providerCode: "MTN_MOMO",
    });

    assert.equal(result.providerExecution.executionMode, "MOCK");
    assert.equal(
      foundation.runtimeAdapterResolver.resolve({ providerCode: "MTN_MOMO" }).reason,
      "runtimeSandboxDisabled"
    );
  });

  it("returns guard failure ExecutionResult when live execution is attempted", async () => {
    const { foundation } = createTestFoundation();
    enableMtnRuntime(foundation);
    const module = new PaymentModule({ paymentFoundation: foundation });

    assert.throws(() => {
      foundation.runtimeExecutionGuard.assertLiveExecutionPrevented({
        env: { PAYMENT_RUNTIME_LIVE: "true" },
      });
    });
    assert.equal(module.getProviderExecutionOrchestrator() != null, true);
  });

  it("propagates correlation through verify flow", async () => {
    const { foundation } = createTestFoundation();
    enableMockPath(foundation);
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.executeFoundationVerify(
      {
        reference: "verify-ref-1",
        providerCode: "MTN_MOMO",
      },
      { correlationId: "corr-verify-1" }
    );

    assert.equal(result.correlationId, "corr-verify-1");
    assert.ok(result.providerExecution);
    assert.equal(result.providerExecution.executionMode, "MOCK");
  });

  it("supports payout through PaymentModule foundation bridge", async () => {
    const { foundation } = createTestFoundation();
    enableMockPath(foundation);
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.executeFoundationPayout({
      orderId: "ord-payout-1",
      buyerId: "buyer-1",
      amount: 500,
      providerCode: "MTN_MOMO",
    });

    assert.equal(result.status, "CREATED");
    assert.ok(result.providerExecution);
    assert.equal(result.providerExecution.success, true);
  });
});

describe("Sprint 3 webhook integration", () => {
  it("verifies MTN webhook via Module 9 mock contract when runtime disabled", async () => {
    const { foundation } = createTestFoundation();
    foundation.featureFlags.enable("mtnEnabled");
    foundation.providerFoundation.providerRegistry.enable("MTN_MOMO");
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.verifyProviderWebhook({
      providerCode: "MTN_MOMO",
      payload: { reference: "wh-1" },
      headers: { "X-Signature": "mock" },
    });

    assert.equal(result.executionMode, "MOCK");
    assert.equal(result.mock, true);
    assert.equal(result.status, "MOCK_NOT_VERIFIED");
  });

  it("verifies Paypack webhook with provider resolution", async () => {
    const { foundation } = createTestFoundation();
    foundation.featureFlags.enable("paypackEnabled");
    foundation.providerFoundation.providerRegistry.enable("PAYPACK");
    const module = new PaymentModule({ paymentFoundation: foundation });

    const result = await module.verifyProviderWebhook({
      providerCode: "PAYPACK",
      payload: { event: "payment.completed" },
    });

    assert.equal(result.providerCode, "PAYPACK");
    assert.equal(result.executionMode, "MOCK");
  });
});

describe("FeatureFlagRolloutSupport", () => {
  it("applies env overrides only when explicitly invoked", () => {
    const { foundation } = createTestFoundation();
    assert.equal(foundation.featureFlags.isEnabled("paymentEngineEnabled"), false);

    FeatureFlagRolloutSupport.applyEngineEnvOverrides(foundation.featureFlags, {
      PAYMENT_ENGINE_ENABLED: "true",
      PAYMENT_MTN_ENABLED: "1",
    });

    assert.equal(foundation.featureFlags.isEnabled("paymentEngineEnabled"), true);
    assert.equal(foundation.featureFlags.isEnabled("mtnEnabled"), true);
    assert.equal(foundation.runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled"), false);
  });

  it("documents rollout support without changing defaults", () => {
    const support = FeatureFlagRolloutSupport.describeRolloutSupport();
    assert.equal(support.defaults, "OFF");
    assert.ok(support.envKeys.includes("PAYMENT_RUNTIME_SANDBOX_ENABLED"));
    assert.match(support.liveExecution, /blocked/i);
  });
});
