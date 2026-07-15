const path = require("path");
const fs = require("fs");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const rootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
}

const {
  TransactionRepository,
  TransactionService,
  PaymentTransaction,
  PaymentTransactionStatus,
} = require("../index");

const TEST_URI = process.env.MONGODB_TEST_URI || process.env.DB_URL || null;
const S = PaymentTransactionStatus;

describe("Transaction MongoDB integration", { skip: !TEST_URI }, () => {
  let repository;
  let service;

  before(async () => {
    await mongoose.connect(TEST_URI);
    repository = new TransactionRepository();
    await repository.ensureIndexes();
    await PaymentTransaction.deleteMany({ transactionId: /^txn_int_/ });
    service = new TransactionService({ repository });
  });

  after(async () => {
    await PaymentTransaction.deleteMany({ transactionId: /^txn_int_/ });
    await mongoose.disconnect();
  });

  it("persists transaction and lifecycle timestamps in MongoDB", async () => {
    const txn = await service.createTransaction({
      transactionId: `txn_int_${Date.now()}`,
      orderId: `ord-int-${Date.now()}`,
      buyerId: "buyer-int",
      sellerId: "seller-int",
      amount: 25000,
      currency: "RWF",
      paymentReference: `pay-int-${Date.now()}`,
    });

    assert.equal(txn.status, S.CREATED);

    await service.transitionStatus(txn.transactionId, S.PENDING);
    await service.transitionStatus(txn.transactionId, S.AUTHORIZED);
    const captured = await service.transitionStatus(txn.transactionId, S.CAPTURED, {
      providerReference: `momo-${Date.now()}`,
      providerCode: "MTN_MOMO",
    });
    const settled = await service.transitionStatus(txn.transactionId, S.SETTLED);

    const stored = await repository.findByTransactionId(txn.transactionId);
    assert.equal(stored.status, S.SETTLED);
    assert.ok(stored.capturedAt);
    assert.ok(stored.settledAt);
    assert.equal(captured.providerCode, "MTN_MOMO");

    const byOrder = await repository.findByOrderId(txn.orderId);
    assert.equal(byOrder.transactionId, txn.transactionId);

    const buyerList = await service.listByBuyerId("buyer-int");
    assert.ok(buyerList.some((row) => row.transactionId === txn.transactionId));
  });

  it("enforces unique transactionId index", async () => {
    const id = `txn_int_dup_${Date.now()}`;
    await service.createTransaction({
      transactionId: id,
      amount: 100,
      buyerId: "buyer-dup",
    });

    await assert.rejects(
      () =>
        service.createTransaction({
          transactionId: id,
          amount: 200,
          buyerId: "buyer-dup",
        }),
      /duplicate|E11000/i
    );
  });

  it("rejects invalid transition persisted in database", async () => {
    const txn = await service.createTransaction({
      transactionId: `txn_int_invalid_${Date.now()}`,
      amount: 500,
      buyerId: "buyer-invalid",
    });

    await assert.rejects(
      () => service.transitionStatus(txn.transactionId, S.REFUNDED),
      /Invalid PaymentTransaction transition/
    );
  });
});

if (!TEST_URI) {
  console.log("Skipping transaction integration tests — set MONGODB_TEST_URI or DB_URL");
}
