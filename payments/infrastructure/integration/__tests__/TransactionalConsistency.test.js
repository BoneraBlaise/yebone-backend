const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  createTestIntegrationFoundation,
  createRetryableIdempotencyService,
} = require("./testHelpers");
const PaymentExecutionContext = require("../PaymentExecutionContext");
const PaymentExecutionPipeline = require("../PaymentExecutionPipeline");
const { ExecutionStage } = require("../ExecutionStage");
const { AuditAction } = require("../../audit/AuditEvent");
const PaymentTransactionStatus = require("../../transactions/PaymentTransactionStatus");
const SettlementIdentity = require("../SettlementIdentity");
const SettlementPartialStateError = require("../errors/SettlementPartialStateError");

describe("Transactional consistency (architecture invariants)", () => {
  let foundation;

  beforeEach(() => {
    foundation = createTestIntegrationFoundation();
  });

  it("does not call PaymentEngine.charge — engine is readiness-only", async () => {
    let chargeCalled = false;
    foundation.deps.engine.charge = async () => {
      chargeCalled = true;
      return {};
    };

    await foundation.gate.execute(
      {
        orderId: "ord-arch-1",
        buyerId: "buyer-arch-1",
        sellerId: "seller-arch-1",
        amount: 5000,
      },
      { correlationId: "corr-arch-1", idempotencyKey: "arch-idem-1" }
    );

    assert.equal(chargeCalled, false);
  });

  it("transitions transaction to SETTLED before audit and events", async () => {
    await foundation.gate.execute(
      {
        orderId: "ord-status-1",
        buyerId: "buyer-status-1",
        sellerId: "seller-status-1",
        amount: 7000,
      },
      { correlationId: "corr-status-1", idempotencyKey: "status-idem-1" }
    );

    const txn = foundation.transactionRepository.store[0];
    assert.equal(txn.status, PaymentTransactionStatus.SETTLED);
    assert.ok(txn.settledAt);
  });

  it("commits ledger before audit and events on success", async () => {
    const result = await foundation.gate.execute(
      {
        orderId: "ord-order-1",
        buyerId: "buyer-order-1",
        sellerId: "seller-order-1",
        amount: 9000,
      },
      { correlationId: "corr-order-1", idempotencyKey: "order-idem-1" }
    );

    assert.equal(foundation.ledgerFoundation.engine.trialBalance().balanced, true);
    assert.equal(result.ledgerJournalIds.length, 2);

    const audit = foundation.auditRepository.store.find(
      (row) => row.action === AuditAction.PAYMENT_SETTLED
    );
    assert.ok(audit);
    assert.equal(audit.after.status, PaymentTransactionStatus.SETTLED);
    assert.ok(result.eventId);
    assert.equal(result.finalStage, ExecutionStage.COMPLETE);
  });

  it("uses deterministic transaction id derived from idempotency key", async () => {
    const idempotencyKey = "deterministic-idem-key";
    await foundation.gate.execute(
      {
        orderId: "ord-det",
        buyerId: "buyer-det",
        sellerId: "seller-det",
        amount: 4200,
      },
      { correlationId: "corr-det", idempotencyKey }
    );

    const expectedId = SettlementIdentity.deriveTransactionId(idempotencyKey);
    assert.equal(foundation.transactionRepository.store[0].transactionId, expectedId);
  });

  it("allows partial state when failure occurs after ledger posting", async () => {
    const failingDeps = {
      ...foundation.deps,
      walletService: {
        list: () => [],
        create: () => {
          throw new Error("wallet projection unavailable");
        },
        project: () => {
          throw new Error("should not reach");
        },
      },
    };

    const pipeline = new PaymentExecutionPipeline(failingDeps);
    let context = PaymentExecutionContext.create(
      {
        orderId: "ord-partial",
        buyerId: "buyer-partial",
        sellerId: "seller-partial",
        amount: 4000,
      },
      {
        correlationId: "corr-partial",
        requestId: "req-partial",
        idempotencyKey: "partial-idem-key",
      }
    );

    context = await pipeline.runEngineStage(context);
    context = PaymentExecutionContext.advance(context, ExecutionStage.IDEMPOTENCY);

    await assert.rejects(() => pipeline.runSettlementStages(context));

    assert.equal(foundation.transactionRepository.store.length, 1);
    assert.equal(foundation.transactionRepository.store[0].status, PaymentTransactionStatus.SETTLED);
    assert.equal(foundation.ledgerFoundation.store.journals.length, 2);
    assert.equal(foundation.auditRepository.store.length, 0);
  });

  it("does not emit audit or events when settlement fails before those stages", async () => {
    const pipeline = new PaymentExecutionPipeline({
      ...foundation.deps,
      walletService: {
        list: () => [],
        create: () => {
          throw new Error("wallet blocked");
        },
        project: () => {
          throw new Error("should not reach");
        },
      },
    });

    let context = PaymentExecutionContext.create(
      {
        orderId: "ord-no-event",
        buyerId: "buyer-no-event",
        sellerId: "seller-no-event",
        amount: 3000,
      },
      {
        correlationId: "corr-no-event",
        requestId: "req-no-event",
        idempotencyKey: "no-event-idem",
      }
    );

    context = PaymentExecutionContext.advance(
      await pipeline.runEngineStage(context),
      ExecutionStage.IDEMPOTENCY
    );

    await assert.rejects(() => pipeline.runSettlementStages(context));

    assert.equal(
      foundation.auditRepository.store.filter((row) => row.action === AuditAction.PAYMENT_SETTLED).length,
      0
    );
    assert.equal(foundation.events.bus.inspect().publishedEvents, 0);
  });

  it("derives wallet balance entirely from ledger without storing balance in wallet map", async () => {
    await foundation.gate.execute(
      {
        orderId: "ord-wallet-replay",
        buyerId: "buyer-wallet-replay",
        sellerId: "seller-wallet-replay",
        amount: 10000,
      },
      { correlationId: "corr-wallet-replay", idempotencyKey: "wallet-replay-idem" }
    );

    const sellerWallet = foundation.wallet.service.list()[0];
    const projected = foundation.wallet.service.project(sellerWallet.walletId);

    assert.equal(projected.balance.source, "LEDGER");
    assert.equal(projected.balance.total, 9000);
    assert.equal(foundation.wallet.service.wallets.get(sellerWallet.walletId).balance, undefined);
  });

  it("replays idempotent success without duplicating committed settlement artifacts", async () => {
    const input = {
      orderId: "ord-idem-replay",
      buyerId: "buyer-idem-replay",
      sellerId: "seller-idem-replay",
      amount: 5500,
    };
    const trace = {
      correlationId: "corr-idem-replay",
      idempotencyKey: "idem-replay-arch",
    };

    const first = await foundation.gate.execute(input, trace);
    const second = await foundation.gate.execute(input, trace);

    assert.equal(first.transactionId, second.transactionId);
    assert.equal(foundation.transactionRepository.store.length, 1);
    assert.equal(foundation.ledgerFoundation.store.journals.length, 2);
    assert.equal(
      foundation.auditRepository.store.filter((row) => row.action === AuditAction.PAYMENT_SETTLED).length,
      1
    );
  });

  it("failed retry reuses transaction and ledger without duplication", async () => {
    const idempotencyKey = "retry-safe-idem";
    const input = {
      orderId: "ord-retry",
      buyerId: "buyer-retry",
      sellerId: "seller-retry",
      amount: 6500,
    };
    const trace = { correlationId: "corr-retry", idempotencyKey };

    let failWallet = true;
    const deps = {
      ...foundation.deps,
      idempotencyService: createRetryableIdempotencyService(),
      walletService: {
        list: foundation.deps.walletService.list.bind(foundation.deps.walletService),
        create: foundation.deps.walletService.create.bind(foundation.deps.walletService),
        project: () => {
          if (failWallet) {
            throw new Error("wallet temporarily unavailable");
          }
          return foundation.deps.walletService.project(
            foundation.wallet.service.list()[0].walletId
          );
        },
      },
    };

    const gate = new (require("../PaymentIntegrationGate"))({
      deps,
      pipeline: new PaymentExecutionPipeline(deps),
    });

    await assert.rejects(() => gate.execute(input, trace));

    failWallet = false;
    const result = await gate.execute(input, trace);

    assert.equal(foundation.transactionRepository.store.length, 1);
    assert.equal(foundation.ledgerFoundation.store.journals.length, 2);
    assert.equal(result.success, true);
    assert.ok(
      foundation.auditRepository.store.filter((row) => row.action === AuditAction.PAYMENT_SETTLED).length >= 1
    );
  });

  it("blocks retry when partial ledger state exists", async () => {
    const idempotencyKey = "partial-ledger-idem";
    const transactionId = SettlementIdentity.deriveTransactionId(idempotencyKey);
    const fundJournalId = SettlementIdentity.fundJournalId(transactionId);

    foundation.ledgerFoundation.store.postedJournalIds.add(fundJournalId);
    foundation.ledgerFoundation.store.journals.push({
      journalId: fundJournalId,
      entries: [],
    });

    await foundation.transactionRepository.create({
      transactionId,
      orderId: "ord-partial-ledger",
      buyerId: "buyer-partial-ledger",
      sellerId: "seller-partial-ledger",
      amount: 1000,
      currency: "UGX",
      status: PaymentTransactionStatus.CAPTURED,
      metadata: {},
    });

    let context = PaymentExecutionContext.create(
      {
        orderId: "ord-partial-ledger",
        buyerId: "buyer-partial-ledger",
        sellerId: "seller-partial-ledger",
        amount: 1000,
      },
      { correlationId: "corr-partial-ledger", idempotencyKey }
    );

    context = PaymentExecutionContext.advance(context, ExecutionStage.IDEMPOTENCY, {
      transaction: await foundation.deps.transactionService.getTransaction(transactionId),
    });

    await assert.rejects(
      () => foundation.pipeline._postLedger(context),
      SettlementPartialStateError
    );
  });
});
