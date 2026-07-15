const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const EngineHealthContract = require("../EngineHealthContract");
const PaymentEngine = require("../PaymentEngine");
const ProviderRegistry = require("../ProviderRegistry");
const ProviderResolver = require("../ProviderResolver");
const FeatureFlagRegistry = require("../FeatureFlagRegistry");

function createEngine(overrides = {}) {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.registerDefaults();
  const featureFlags = new FeatureFlagRegistry();
  const providerResolver = new ProviderResolver({ registry: providerRegistry, featureFlags });

  return new PaymentEngine({
    idempotencyService: { execute: async (_k, _p, h) => h() },
    transactionService: { createTransaction: async () => ({ transactionId: "txn-1" }) },
    auditService: { record: async () => ({}) },
    providerResolver,
    featureFlags,
    ...overrides,
  });
}

describe("EngineHealthContract", () => {
  it("returns structured health when all dependencies are ready", () => {
    const engine = createEngine();
    const health = engine.health();

    assert.equal(health.healthy, true);
    assert.equal(health.paymentEngineEnabled, false);
    assert.equal(health.idempotency, "ready");
    assert.equal(health.transactionService, "ready");
    assert.equal(health.auditService, "ready");
    assert.equal(health.providerRegistry, "ready");
    assert.equal(health.providerResolver, "ready");
    assert.equal(health.providersRegistered, 5);
    assert.equal(health.providersEnabled, 0);
    assert.equal(typeof health.version, "string");
    assert.deepEqual(health.foundationModules, {
      idempotency: true,
      transactions: true,
      audit: true,
    });
  });

  it("reports unhealthy when a foundation dependency is missing", () => {
    const engine = {
      idempotencyService: { execute: async () => {} },
      transactionService: { createTransaction: async () => ({}) },
      auditService: {},
      providerResolver: { registry: new ProviderRegistry() },
      featureFlags: { isEnabled: () => false, list: () => ({}) },
    };

    const health = EngineHealthContract.build(engine);
    assert.equal(health.healthy, false);
    assert.equal(health.auditService, "missing");
    assert.equal(health.foundationModules.audit, false);
  });

  it("does not perform external calls", () => {
    const engine = createEngine();
    const health = engine.health();
    assert.ok(health.checkedAt);
    assert.equal(health.paymentEngineEnabled, false);
  });
});
