const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const DependencyInjectionBootstrap = require("../bootstrap/DependencyInjectionBootstrap");
const PaymentApplicationBootstrap = require("../bootstrap/PaymentApplicationBootstrap");

function createMemoryFoundationServices() {
  const idempotencyStore = new Map();

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
      return {
        transactionId: "txn_app_1",
        paymentReference: input.paymentReference || "ref_app_1",
        status: "CREATED",
        ...input,
      };
    },
  };

  const auditService = {
    async record(event) {
      return Object.freeze({ ...event });
    },
  };

  return {
    idempotency: { service: idempotencyService, repository: {}, cleanup: {} },
    transactions: { service: transactionService, repository: {} },
    audit: { service: auditService, repository: {} },
  };
}

describe("Phase 4 application bootstrap integration", () => {
  it("DependencyInjectionBootstrap preserves legacy PaymentModule by default", () => {
    const runtime = DependencyInjectionBootstrap.create();
    assert.equal(runtime.paymentModule.isPaymentFoundationWired(), false);
    assert.equal(runtime.paymentFoundation, null);
    assert.equal(runtime.webhookRegistry.list().length, 0);
  });

  it("DependencyInjectionBootstrap composes foundation when config flag is set", () => {
    const memory = createMemoryFoundationServices();
    const runtime = DependencyInjectionBootstrap.create({
      config: { composePaymentFoundation: true },
      paymentFoundationOptions: {
        engineOptions: {
          idempotency: memory.idempotency,
          transactions: memory.transactions,
          audit: memory.audit,
        },
      },
    });

    assert.equal(runtime.paymentModule.isPaymentFoundationWired(), true);
    assert.ok(runtime.paymentFoundation);
    assert.ok(runtime.paymentModule.getPaymentEngine());
    assert.ok(runtime.paymentModule.getProviderExecutionOrchestrator());
    assert.deepEqual(runtime.webhookRegistry.list().sort(), ["MTN_MOMO", "PAYPACK"]);
    assert.equal(runtime.paymentFoundation.featureFlags.isEnabled("paymentEngineEnabled"), false);
  });

  it("PaymentApplicationBootstrap applies rollout flags only when explicitly requested", () => {
    const memory = createMemoryFoundationServices();
    const foundation = PaymentApplicationBootstrap.composeFoundation({
      foundationOptions: {
        engineOptions: {
          idempotency: memory.idempotency,
          transactions: memory.transactions,
          audit: memory.audit,
        },
      },
      applyFeatureFlagRollout: true,
      env: {
        PAYMENT_ENGINE_ENABLED: "true",
        PAYMENT_RUNTIME_SANDBOX_ENABLED: "false",
      },
    });

    assert.equal(foundation.featureFlags.isEnabled("paymentEngineEnabled"), true);
    assert.equal(foundation.runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled"), false);
  });

  it("ProductionReadinessCheck reports foundation wiring state without requiring it", () => {
    const legacy = DependencyInjectionBootstrap.create();
    const legacyReport = legacy.productionReadiness.run();
    assert.equal(legacyReport.checks.paymentFoundationWired, false);
    assert.equal(legacyReport.checks.paymentFoundationOptional, true);
    assert.equal(legacyReport.healthy, true);

    const memory = createMemoryFoundationServices();
    const composed = DependencyInjectionBootstrap.create({
      config: { composePaymentFoundation: true },
      paymentFoundationOptions: {
        engineOptions: {
          idempotency: memory.idempotency,
          transactions: memory.transactions,
          audit: memory.audit,
        },
      },
    });
    const composedReport = composed.productionReadiness.run();
    assert.equal(composedReport.checks.paymentFoundationWired, true);
    assert.equal(composedReport.healthy, true);
  });
});
