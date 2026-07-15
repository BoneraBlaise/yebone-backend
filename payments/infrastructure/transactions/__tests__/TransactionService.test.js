const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const TransactionService = require("../TransactionService");
const PaymentTransactionStatus = require("../PaymentTransactionStatus");
const InvalidStateTransitionError = require("../../../financial/errors/InvalidStateTransitionError");
const TransactionStatusConflictError = require("../errors/TransactionStatusConflictError");

const S = PaymentTransactionStatus;

function createMemoryRepository() {
  const store = new Map();

  return {
    store,
    async ensureIndexes() {},
    async create(record) {
      if (store.has(record.transactionId)) {
        const err = new Error("duplicate");
        err.code = 11000;
        throw err;
      }
      const doc = { ...record, createdAt: new Date(), updatedAt: new Date() };
      store.set(record.transactionId, doc);
      return { ...doc };
    },
    async findByTransactionId(transactionId) {
      const doc = store.get(transactionId);
      return doc ? { ...doc } : null;
    },
    async findByPaymentReference(paymentReference) {
      const all = [...store.values()].filter((d) => d.paymentReference === paymentReference);
      return all.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
    },
    async findByProviderReference(providerReference) {
      const all = [...store.values()].filter((d) => d.providerReference === providerReference);
      return all.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
    },
    async findByOrderId(orderId) {
      const all = [...store.values()].filter((d) => d.orderId === orderId);
      return all.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
    },
    async listByBuyerId(buyerId) {
      return [...store.values()].filter((d) => d.buyerId === buyerId);
    },
    async listBySellerId(sellerId) {
      return [...store.values()].filter((d) => d.sellerId === sellerId);
    },
    async transitionStatus(transactionId, fromStatus, toStatus, patch = {}) {
      const doc = store.get(transactionId);
      if (!doc || doc.status !== fromStatus) return null;
      Object.assign(doc, patch, { status: toStatus, updatedAt: new Date() });
      return { ...doc };
    },
  };
}

describe("TransactionService (unit)", () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = createMemoryRepository();
    service = new TransactionService({ repository });
  });

  it("creates transaction in CREATED state with RWF default", async () => {
    const txn = await service.createTransaction({
      orderId: "ord-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      amount: 5000,
    });

    assert.match(txn.transactionId, /^txn_/);
    assert.equal(txn.status, S.CREATED);
    assert.equal(txn.currency, "RWF");
    assert.equal(txn.amount, 5000);
  });

  it("transitions through lifecycle and sets capturedAt/settledAt", async () => {
    const txn = await service.createTransaction({
      orderId: "ord-2",
      buyerId: "buyer-1",
      amount: 1000,
      currency: "RWF",
    });

    await service.transitionStatus(txn.transactionId, S.PENDING);
    await service.transitionStatus(txn.transactionId, S.AUTHORIZED);
    const captured = await service.transitionStatus(txn.transactionId, S.CAPTURED, {
      providerReference: "prov-1",
      providerCode: "MTN_MOMO",
    });
    const settled = await service.transitionStatus(txn.transactionId, S.SETTLED);

    assert.ok(captured.capturedAt);
    assert.ok(settled.settledAt);
    assert.equal(captured.providerReference, "prov-1");
  });

  it("rejects invalid lifecycle transition", async () => {
    const txn = await service.createTransaction({ amount: 100, buyerId: "b1" });
    await assert.rejects(
      () => service.transitionStatus(txn.transactionId, S.SETTLED),
      InvalidStateTransitionError
    );
  });

  it("replays idempotent transition to same status", async () => {
    const txn = await service.createTransaction({ amount: 100, buyerId: "b1" });
    await service.transitionStatus(txn.transactionId, S.PENDING);
    const again = await service.transitionStatus(txn.transactionId, S.PENDING);
    assert.equal(again.status, S.PENDING);
  });

  it("throws status conflict when record changed concurrently", async () => {
    const txn = await service.createTransaction({ amount: 100, buyerId: "b1" });
    await service.transitionStatus(txn.transactionId, S.PENDING);

    const originalTransition = repository.transitionStatus.bind(repository);
    repository.transitionStatus = async (transactionId, fromStatus, toStatus, patch) => {
      repository.store.get(transactionId).status = S.FAILED;
      return originalTransition(transactionId, fromStatus, toStatus, patch);
    };

    await assert.rejects(
      () => service.transitionStatus(txn.transactionId, S.AUTHORIZED),
      TransactionStatusConflictError
    );
  });

  it("sets refundedAt on REFUNDED transition", async () => {
    const txn = await service.createTransaction({ amount: 100, buyerId: "b1" });
    await service.transitionStatus(txn.transactionId, S.PENDING);
    await service.transitionStatus(txn.transactionId, S.CAPTURED);
    const refunded = await service.transitionStatus(txn.transactionId, S.REFUNDED);
    assert.ok(refunded.refundedAt);
  });
});
