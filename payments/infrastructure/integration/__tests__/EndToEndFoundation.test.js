const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createTestIntegrationFoundation } = require("./testHelpers");
const { AuditAction } = require("../../audit/AuditEvent");
const { EventTypes } = require("../../events");
const { ExecutionStage, STAGE_ORDER } = require("../ExecutionStage");

describe("End-to-end payment foundation flow", () => {
  let foundation;
  const correlationId = "e2e-corr-001";
  const requestId = "e2e-req-001";
  const idempotencyKey = "e2e-idem-001";

  beforeEach(() => {
    foundation = createTestIntegrationFoundation();
  });

  it("simulates buyer payment through all foundation modules", async () => {
    const published = [];
    foundation.events.bus.subscribe(EventTypes.PAYMENT_SETTLED, async (envelope) => {
      published.push(envelope);
    });

    const result = await foundation.gate.execute(
      {
        orderId: "ord-e2e-100",
        buyerId: "buyer-e2e",
        sellerId: "seller-e2e",
        amount: 10000,
        currency: "UGX",
        paymentMethod: "MOBILE_MONEY",
        providerCode: "MTN_MOMO",
      },
      { correlationId, requestId, idempotencyKey }
    );

    assert.equal(result.success, true);
    assert.equal(result.correlationId, correlationId);
    assert.equal(result.finalStage, ExecutionStage.COMPLETE);
    assert.deepEqual(result.completedStages, STAGE_ORDER);
    assert.equal(result.diagnostics.monitoring.complete, true);

    const transaction = foundation.transactionRepository.store[0];
    assert.equal(result.transactionId, transaction.transactionId);
    assert.equal(transaction.metadata.correlationId, correlationId);

    const trial = foundation.ledgerFoundation.engine.trialBalance();
    assert.equal(trial.balanced, true);
    assert.equal(result.ledgerJournalIds.length, 2);

    assert.ok(result.walletBalance > 0);
    assert.equal(result.walletBalance, 9000);

    const audit = foundation.auditRepository.store.find(
      (entry) => entry.action === AuditAction.PAYMENT_SETTLED
    );
    assert.ok(audit);
    assert.equal(audit.correlationId, correlationId);
    assert.equal(result.auditId, audit.auditId);

    await foundation.events.bus.dispatch(result.eventId);
    assert.equal(published.length, 1);
    assert.equal(published[0].correlationId, correlationId);
    assert.equal(published[0].payload.transactionId, result.transactionId);
  });

  it("preserves transaction and correlation ids on idempotent replay", async () => {
    const input = {
      orderId: "ord-e2e-idem",
      buyerId: "buyer-e2e-idem",
      sellerId: "seller-e2e-idem",
      amount: 6000,
    };
    const trace = {
      correlationId: "e2e-corr-idem",
      requestId: "e2e-req-idem",
      idempotencyKey: "e2e-idem-replay",
    };

    const first = await foundation.gate.execute(input, trace);
    const second = await foundation.gate.execute(input, trace);

    assert.equal(first.transactionId, second.transactionId);
    assert.equal(first.correlationId, second.correlationId);
    assert.equal(foundation.transactionRepository.store.length, 1);
  });

  it("integration module has no PaymentModule imports", () => {
    const integrationRoot = path.join(__dirname, "..");
    const files = collectJsFiles(integrationRoot);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const badPaymentModuleImport = /require\s*\(\s*['"][^'"]*PaymentModule(?!Bridge)/;
      assert.equal(badPaymentModuleImport.test(content), false, `${file} must not require PaymentModule`);
      assert.equal(/\bfrom\s+['"][^'"]*PaymentModule/.test(content), false, `${file} must not import PaymentModule`);
      assert.equal(content.includes("require(\"../providers"), false, `${file} must not import providers`);
    }
  });
});

function collectJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "__tests__" || entry.name === "PaymentModuleBridge.js") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}
