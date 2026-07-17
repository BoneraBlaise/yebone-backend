const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { registerPaymentRuntime } = require("../index");
const TransactionService = require("../../infrastructure/transactions/TransactionService");
const PaymentTransactionStatus = require("../../infrastructure/transactions/PaymentTransactionStatus");
const { createEventBus } = require("../../infrastructure/events");
const IdempotencyConfig = require("../../infrastructure/idempotency/IdempotencyConfig");

const { PROCESSING, COMPLETED } = IdempotencyConfig.recordStatus;

function createMemoryIdempotencyRepository() {
  const store = new Map();
  const requestIndex = new Map();
  const keyOf = (scope, idempotencyKey) => `${scope || ""}::${idempotencyKey}`;

  return {
    async findByKey(scope, idempotencyKey) {
      return store.get(keyOf(scope, idempotencyKey)) || null;
    },
    async findByRequestId(requestId) {
      const k = requestIndex.get(requestId);
      return k ? store.get(k) || null : null;
    },
    async claimProcessing(input) {
      const k = keyOf(input.scope, input.idempotencyKey);
      if (store.has(k)) {
        return { claimed: false, record: store.get(k) };
      }
      const record = { ...input, status: PROCESSING, createdAt: new Date() };
      store.set(k, record);
      requestIndex.set(input.requestId, k);
      return { claimed: true, record };
    },
    async markCompleted(scope, idempotencyKey, result) {
      const k = keyOf(scope, idempotencyKey);
      const record = store.get(k);
      if (!record || record.status !== PROCESSING) return null;
      record.status = COMPLETED;
      record.result = result;
      return record;
    },
    async markFailed() {
      return null;
    },
  };
}

function createMemoryTransactionRepository(seed = []) {
  const store = [...seed];
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
      if (current.status !== fromStatus && current.status !== toStatus) {
        return null;
      }
      const updated = {
        ...current,
        ...patch,
        status: toStatus,
        metadata: patch.metadata || current.metadata,
      };
      store[index] = updated;
      return { ...updated };
    },
  };
}

function httpRequest(app, { method, path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const payload = body === undefined ? "" : JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            ...headers,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            server.close();
            resolve({
              status: res.statusCode,
              body: data ? JSON.parse(data) : null,
            });
          });
        }
      );
      req.on("error", (error) => {
        server.close();
        reject(error);
      });
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

function createReconciliationApp(configOverrides = {}, transactionSeed = []) {
  const transactionRepository = createMemoryTransactionRepository(transactionSeed);
  const transactionService = new TransactionService({ repository: transactionRepository });
  const idempotencyRepository = createMemoryIdempotencyRepository();
  const auditService = {
    async record(event) {
      return Object.freeze({ auditId: "audit-1", ...event });
    },
  };
  const idempotencyService = {
    fingerprint: (payload) => JSON.stringify(payload),
    async execute(_key, _payload, handler) {
      return handler();
    },
  };

  const app = express();
  app.use(express.json());
  const { result } = registerPaymentRuntime(app, {
    config: {
      composePaymentFoundation: true,
      enableWebhooks: true,
      enableWebhookReconciliation: true,
      environment: "development",
      ...configOverrides,
    },
    paymentFoundationOptions: {
      engineOptions: {
        idempotency: { service: idempotencyService, repository: {} },
        transactions: { service: transactionService, repository: transactionRepository },
        audit: { service: auditService, repository: {} },
      },
    },
    webhookReconciliationOptions: {
      webhookIdempotencyRepository: idempotencyRepository,
      eventBus: createEventBus({ autoDispatch: false }).bus,
    },
  });

  return { app, result, transactionRepository, transactionService };
}

describe("Phase 4 Sprint 3 webhook reconciliation", () => {
  it("returns canonical result model on verify-only path when reconciliation disabled", async () => {
    const app = express();
    app.use(express.json());
    registerPaymentRuntime(app, {
      config: {
        composePaymentFoundation: true,
        enableWebhooks: true,
        enableWebhookReconciliation: false,
      },
      paymentFoundationOptions: {
        engineOptions: {
          idempotency: {
            service: { fingerprint: () => "fp", async execute(_k, _p, h) { return h(); } },
            repository: {},
          },
          transactions: {
            service: new TransactionService({
              repository: createMemoryTransactionRepository(),
            }),
            repository: createMemoryTransactionRepository(),
          },
          audit: { service: { async record(e) { return e; } }, repository: {} },
        },
      },
    });

    const response = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/MTN_MOMO",
      body: { event: "payment.completed" },
      headers: { "x-correlation-id": "corr-verify-only" },
    });

    assert.equal(response.status, 202);
    assert.equal(response.body.correlationId, "corr-verify-only");
    assert.equal(typeof response.body.data.accepted, "boolean");
    assert.equal(typeof response.body.data.verified, "boolean");
    assert.equal(response.body.data.reconciled, false);
  });

  it("reconciles transaction status when reconciliation enabled", async () => {
    const { app, transactionRepository } = createReconciliationApp({}, [
      {
        transactionId: "txn_rec_1",
        providerReference: "prov-ref-1",
        paymentReference: "pay-ref-1",
        status: PaymentTransactionStatus.PENDING,
        amount: 1000,
        currency: "RWF",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        orderId: "order-1",
        metadata: {},
      },
    ]);

    const response = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/MTN_MOMO",
      body: {
        event: "payment.completed",
        eventId: "evt-rec-1",
        reference: "prov-ref-1",
        timestamp: new Date().toISOString(),
      },
      headers: { "x-correlation-id": "corr-rec-1" },
    });

    assert.equal(response.status, 202);
    assert.equal(response.body.correlationId, "corr-rec-1");
    assert.equal(response.body.data.reconciled, true);
    assert.equal(response.body.data.currentStatus, "CAPTURED");
    assert.equal(response.body.data.transactionId, "txn_rec_1");
    assert.equal(transactionRepository.store[0].status, "CAPTURED");
  });

  it("returns duplicate result for repeated provider event id", async () => {
    const { app } = createReconciliationApp({}, [
      {
        transactionId: "txn_dup_1",
        providerReference: "prov-dup-1",
        status: PaymentTransactionStatus.PENDING,
        amount: 500,
        currency: "RWF",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        metadata: {},
      },
    ]);

    const body = {
      event: "payment.completed",
      eventId: "evt-dup-shared",
      reference: "prov-dup-1",
      timestamp: new Date().toISOString(),
    };

    const first = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/MTN_MOMO",
      body,
      headers: { "x-correlation-id": "corr-dup-1" },
    });

    const second = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/MTN_MOMO",
      body,
      headers: { "x-correlation-id": "corr-dup-1" },
    });

    assert.equal(first.body.data.reconciled, true);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.duplicate, true);
    assert.equal(second.body.data.reconciled, true);
  });

  it("preserves correlationId across reconciliation result fields", async () => {
    const { app } = createReconciliationApp({}, [
      {
        transactionId: "txn_corr_1",
        providerReference: "prov-corr-1",
        status: PaymentTransactionStatus.CREATED,
        amount: 100,
        currency: "RWF",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        metadata: {},
      },
    ]);

    const response = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/PAYPACK",
      body: {
        event: "checkout.completed",
        eventId: "evt-corr-1",
        reference: "prov-corr-1",
      },
      headers: { "x-correlation-id": "corr-chain-1" },
    });

    assert.equal(response.body.correlationId, "corr-chain-1");
    assert.equal(response.body.data.correlationId, "corr-chain-1");
  });
});
