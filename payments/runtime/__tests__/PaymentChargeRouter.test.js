const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const PaymentChargeRouter = require("../charging/PaymentChargeRouter");
const LegacyPaymentRoutingPolicy = require("../migration/LegacyPaymentRoutingPolicy");
const TransactionLinkRepository = require("../linking/TransactionLinkRepository");
const TransactionLinkService = require("../linking/TransactionLinkService");
const TransactionService = require("../../infrastructure/transactions/TransactionService");
const PaymentModuleFoundationBridge = require("../../PaymentModuleFoundationBridge");

function createMemoryTransactionRepository() {
  const store = [];
  return {
    store,
    async create(record) {
      store.push({ ...record });
      return { ...record };
    },
    async findByTransactionId(transactionId) {
      return store.find((row) => row.transactionId === transactionId) || null;
    },
    async findByProviderReference(providerReference) {
      return store.find((row) => row.providerReference === providerReference) || null;
    },
    async findByPaymentReference(paymentReference) {
      return store.find((row) => row.paymentReference === paymentReference) || null;
    },
    async transitionStatus(transactionId, fromStatus, toStatus, patch = {}) {
      const index = store.findIndex((row) => row.transactionId === transactionId);
      if (index === -1) return null;
      const current = store[index];
      if (current.status !== fromStatus && current.status !== toStatus) return null;
      const updated = { ...current, ...patch, status: toStatus };
      store[index] = updated;
      return { ...updated };
    },
  };
}

describe("PaymentChargeRouter", () => {
  it("uses legacy path when routing policy is disabled", async () => {
    const paymentService = {
      async createOrderPayment(input) {
        return {
          orderPayment: {
            id: "legacy-pay-1",
            providerReference: "prov-route-1",
            orderId: input.orderId,
          },
          providerResult: { providerReference: "prov-route-1", status: "PENDING" },
        };
      },
    };

    const transactionRepository = createMemoryTransactionRepository();
    const transactionService = new TransactionService({
      repository: transactionRepository,
    });
    const linkService = new TransactionLinkService({ repository: new TransactionLinkRepository() });

    const router = new PaymentChargeRouter({
      paymentService,
      routingPolicy: new LegacyPaymentRoutingPolicy({ enabled: false }),
      transactionService,
      transactionLinkService: linkService,
    });

    const result = await router.createOrderPayment(
      {
        orderId: "order-route-1",
        userId: "buyer-1",
        sellerId: "seller-1",
        amount: 1000,
        currency: "RWF",
        method: "MTN_MOMO",
        country: "RW",
      },
      { correlationId: "corr-route-1" }
    );

    assert.equal(result.chargePath, "legacy");
    assert.equal(result.correlationId, "corr-route-1");
    assert.ok(result.link);
    assert.equal(result.link.providerReference, "prov-route-1");
    assert.equal(transactionRepository.store.length, 1);
    assert.equal(transactionRepository.store[0].status, "PENDING");
  });

  it("uses foundation path when policy enables provider routing", async () => {
    const paymentService = {
      async createOrderPayment() {
        throw new Error("legacy path should not run");
      },
    };

    const foundationBridge = new PaymentModuleFoundationBridge({
      paymentEngine: {
        featureFlags: { assertEngineEnabled() {} },
        async charge(_input, trace) {
          return {
            transactionId: "txn_foundation_1",
            paymentReference: "pay-foundation-1",
            providerCode: "MTN_MOMO",
            status: "CREATED",
            correlationId: trace.correlationId,
          };
        },
      },
    });

    const linkService = new TransactionLinkService({ repository: new TransactionLinkRepository() });
    const router = new PaymentChargeRouter({
      paymentService,
      foundationBridge,
      routingPolicy: new LegacyPaymentRoutingPolicy({
        enabled: true,
        foundationChargeProviders: ["MTN_MOMO"],
      }),
      transactionLinkService: linkService,
    });

    const result = await router.createOrderPayment(
      {
        orderId: "order-foundation-1",
        userId: "buyer-1",
        amount: 500,
        currency: "RWF",
        method: "MTN_MOMO",
        country: "RW",
      },
      { correlationId: "corr-foundation-1" }
    );

    assert.equal(result.chargePath, "foundation");
    assert.equal(result.link.module2TransactionId, "txn_foundation_1");
    assert.equal(result.correlationId, "corr-foundation-1");
  });
});
