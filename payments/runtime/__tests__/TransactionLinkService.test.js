const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const TransactionLinkRepository = require("../linking/TransactionLinkRepository");
const TransactionLinkService = require("../linking/TransactionLinkService");

describe("TransactionLinkService", () => {
  let service;

  beforeEach(() => {
    service = new TransactionLinkService({
      repository: new TransactionLinkRepository(),
    });
  });

  it("links legacy and module2 identifiers bidirectionally", async () => {
    const link = await service.link({
      legacyTransactionId: "legacy-1",
      module2TransactionId: "txn_m2_1",
      providerReference: "prov-1",
      paymentReference: "pay-1",
      orderId: "order-1",
      sellerId: "seller-1",
      buyerId: "buyer-1",
      providerCode: "MTN_MOMO",
      correlationId: "corr-link-1",
      chargePath: "legacy",
    });

    assert.equal((await service.findByLegacyTransactionId("legacy-1")).linkId, link.linkId);
    assert.equal((await service.findByModule2TransactionId("txn_m2_1")).linkId, link.linkId);
    assert.equal((await service.findByProviderReference("prov-1")).correlationId, "corr-link-1");
  });

  it("returns existing link for duplicate provider reference without duplicating state", async () => {
    const first = await service.link({
      legacyTransactionId: "legacy-a",
      module2TransactionId: "txn_a",
      providerReference: "prov-dup",
      correlationId: "corr-dup",
      chargePath: "legacy",
    });

    const second = await service.link({
      legacyTransactionId: "legacy-b",
      module2TransactionId: "txn_b",
      providerReference: "prov-dup",
      correlationId: "corr-dup-2",
      chargePath: "legacy",
    });

    assert.equal(second.linkId, first.linkId);
    assert.equal(second.module2TransactionId, "txn_a");
  });

  it("resolves module2 transaction id from provider reference", async () => {
    await service.link({
      legacyTransactionId: "legacy-2",
      module2TransactionId: "txn_m2_2",
      providerReference: "prov-lookup",
      correlationId: "corr-2",
      chargePath: "legacy",
    });

    const resolved = await service.resolveModule2TransactionId({
      providerReference: "prov-lookup",
    });
    assert.equal(resolved, "txn_m2_2");
  });
});
