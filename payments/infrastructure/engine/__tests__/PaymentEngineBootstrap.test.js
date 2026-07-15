const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const createPaymentEngineBootstrap = require("../PaymentEngineBootstrap");
const createPaymentEngine = require("../PaymentEngineFactory");

function createMemoryFoundation() {
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
        transactionId: `txn_boot_${transactionRecords.length + 1}`,
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

describe("PaymentEngine bootstrap", () => {
  it("createPaymentEngineBootstrap assembles foundation services and engine", () => {
    const foundation = createMemoryFoundation();
    const bootstrap = createPaymentEngineBootstrap({
      idempotency: foundation.idempotency,
      transactions: foundation.transactions,
      audit: foundation.audit,
    });

    assert.ok(bootstrap.engine);
    assert.ok(bootstrap.container);
    assert.ok(bootstrap.providerRegistry);
    assert.ok(bootstrap.providerResolver);
    assert.ok(bootstrap.featureFlags);
    assert.equal(bootstrap.featureFlags.isEnabled("paymentEngineEnabled"), false);
    assert.equal(bootstrap.providerRegistry.list().length, 5);
    assert.equal(bootstrap.container.get("engine"), bootstrap.engine);
  });

  it("createPaymentEngineFactory wires injected services only", () => {
    const foundation = createMemoryFoundation();
    const bundle = createPaymentEngine({
      idempotencyService: foundation.idempotency.service,
      transactionService: foundation.transactions.service,
      auditService: foundation.audit.service,
      registerDefaultProviders: true,
    });

    assert.ok(bundle.engine);
    assert.deepEqual(bundle.container.list().sort(), [
      "auditService",
      "engine",
      "featureFlags",
      "idempotencyService",
      "providerRegistry",
      "providerResolver",
      "transactionService",
    ]);
  });

  it("bootstrap does not auto-enable engine or providers", () => {
    const foundation = createMemoryFoundation();
    const bootstrap = createPaymentEngineBootstrap({
      idempotency: foundation.idempotency,
      transactions: foundation.transactions,
      audit: foundation.audit,
    });

    for (const entry of bootstrap.providerRegistry.list()) {
      assert.equal(entry.enabled, false);
    }
    assert.equal(bootstrap.featureFlags.list().paymentEngineEnabled, false);
  });
});
