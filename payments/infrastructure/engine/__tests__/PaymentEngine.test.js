const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const PaymentEngine = require("../PaymentEngine");
const ProviderRegistry = require("../ProviderRegistry");
const ProviderResolver = require("../ProviderResolver");
const FeatureFlagRegistry = require("../FeatureFlagRegistry");
const PaymentEngineDisabledError = require("../errors/PaymentEngineDisabledError");
const { AuditAction } = require("../../audit/AuditEvent");

function createMocks() {
  const auditRecords = [];
  const transactions = [];

  const idempotencyService = {
    fingerprint: (payload) => JSON.stringify(payload),
    async execute(key, payload, handler) {
      return handler();
    },
  };

  const transactionService = {
    async createTransaction(input) {
      const record = {
        transactionId: `txn_${transactions.length + 1}`,
        paymentReference: input.paymentReference || null,
        status: "CREATED",
        ...input,
      };
      transactions.push(record);
      return record;
    },
  };

  const auditService = {
    async record(event) {
      auditRecords.push(event);
      return Object.freeze({ ...event });
    },
  };

  return { idempotencyService, transactionService, auditService, auditRecords, transactions };
}

function createEngine(services, featureFlagOverrides = {}) {
  const featureFlags = new FeatureFlagRegistry(featureFlagOverrides);
  const providerRegistry = new ProviderRegistry();
  providerRegistry.registerDefaults();
  const providerResolver = new ProviderResolver({ registry: providerRegistry, featureFlags });

  const engine = new PaymentEngine({
    ...services,
    providerResolver,
    featureFlags,
  });

  return { engine, featureFlags, providerRegistry };
}

describe("PaymentEngine", () => {
  let mocks;
  let engine;
  let featureFlags;
  let providerRegistry;

  beforeEach(() => {
    mocks = createMocks();
    ({ engine, featureFlags, providerRegistry } = createEngine(mocks));
  });

  it("reports disabled health when feature flag is OFF", () => {
    const health = engine.health();
    assert.equal(health.healthy, true);
    assert.equal(health.paymentEngineEnabled, false);
    assert.equal(health.providersRegistered, 5);
  });

  it("throws PaymentEngineDisabledError when engine flag is OFF", async () => {
    await assert.rejects(
      () =>
        engine.charge({
          orderId: "ord-1",
          buyerId: "buyer-1",
          amount: 1000,
          providerCode: "MTN_MOMO",
        }),
      PaymentEngineDisabledError
    );
  });

  it("orchestrates idempotency, transaction, audit, and provider resolve", async () => {
    featureFlags.enable("paymentEngineEnabled");
    featureFlags.enable("mtnEnabled");
    providerRegistry.enable("MTN_MOMO");

    const result = await engine.charge({
      orderId: "ord-100",
      buyerId: "buyer-100",
      sellerId: "seller-100",
      amount: 5000,
      providerCode: "MTN_MOMO",
      paymentMethod: "MOBILE_MONEY",
      countryCode: "RW",
    });

    assert.equal(result.status, "CREATED");
    assert.equal(result.providerCode, "MTN_MOMO");
    assert.equal(mocks.transactions.length, 1);
    assert.equal(mocks.auditRecords.length, 1);
    assert.equal(mocks.auditRecords[0].action, AuditAction.PAYMENT_CREATED);
  });

  it("requires injectable foundation services", () => {
    assert.throws(
      () =>
        new PaymentEngine({
          transactionService: mocks.transactionService,
          auditService: mocks.auditService,
          providerResolver: {},
          featureFlags: new FeatureFlagRegistry(),
        }),
      /requires idempotencyService/
    );
  });

  it("remains unchanged when providerExecutionOrchestrator is not injected", async () => {
    featureFlags.enable("paymentEngineEnabled");
    featureFlags.enable("mtnEnabled");
    providerRegistry.enable("MTN_MOMO");

    const result = await engine.charge({
      orderId: "ord-no-orchestrator",
      buyerId: "buyer-1",
      amount: 1000,
      providerCode: "MTN_MOMO",
    });

    assert.equal(result.status, "CREATED");
    assert.equal("providerExecution" in result, false);
  });

  it("optionally invokes providerExecutionOrchestrator when injected", async () => {
    const createProviderFoundation = require("../../providers/ProviderAdapterFactory");
    const { createRuntimeFoundation } = require("../../providers/runtime/RuntimeBootstrap");
    const providerFoundation = createProviderFoundation();
    providerFoundation.providerRegistry.enable("MTN_MOMO");
    providerFoundation.featureFlags.enable("mtnEnabled");

    const runtimeFoundation = createRuntimeFoundation({
      providerRegistry: providerFoundation.providerRegistry,
      skeletonAdapterRegistry: providerFoundation.adapterRegistry,
      featureFlags: providerFoundation.featureFlags,
      providerAdapterResolver: providerFoundation.adapterResolver,
      providerCapabilityValidator: providerFoundation.capabilityValidator,
    });

    const orchestratorEngine = new PaymentEngine({
      ...mocks,
      providerResolver: providerFoundation.providerResolver,
      featureFlags: providerFoundation.featureFlags,
      providerExecutionOrchestrator: runtimeFoundation.providerExecutionOrchestrator,
    });
    orchestratorEngine.featureFlags.enable("paymentEngineEnabled");

    const result = await orchestratorEngine.charge({
      orderId: "ord-with-orchestrator",
      buyerId: "buyer-1",
      amount: 2000,
      providerCode: "MTN_MOMO",
      countryCode: "RW",
    });

    assert.equal(result.status, "CREATED");
    assert.ok(result.providerExecution);
    assert.equal(result.providerExecution.success, true);
    assert.equal(result.providerExecution.executionMode, "MOCK");
    assert.equal(result.providerExecution.providerResponse.mock, true);
    assert.equal("executionTimeline" in result.providerExecution, false);
    assert.equal("diagnostics" in result.providerExecution, false);
  });
});
