const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { registerPaymentRuntime } = require("../index");
const PaymentChargeRouter = require("../charging/PaymentChargeRouter");
const TransactionLinkRepository = require("../linking/TransactionLinkRepository");
const TransactionService = require("../../infrastructure/transactions/TransactionService");
const PaymentTransactionStatus = require("../../infrastructure/transactions/PaymentTransactionStatus");
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

describe("Phase 4A stabilization integration", () => {
  it("links legacy charge to module2 transaction and reconciles webhook with same correlationId", async () => {
    const transactionRepository = createMemoryTransactionRepository();
    const transactionService = new TransactionService({ repository: transactionRepository });
    const idempotencyRepository = createMemoryIdempotencyRepository();
    const transactionLinkRepository = new TransactionLinkRepository();

    const paymentService = {
      async createOrderPayment(input) {
        return {
          orderPayment: {
            id: "legacy-charge-1",
            providerReference: "prov-4a-1",
            orderId: input.orderId,
          },
          providerResult: { providerReference: "prov-4a-1", status: "PENDING" },
        };
      },
    };

    const app = express();
    app.use(express.json());

    const { runtime } = registerPaymentRuntime(app, {
      config: {
        composePaymentFoundation: true,
        enableWebhooks: true,
        enableWebhookReconciliation: true,
      },
      transactionLinkRepository,
      paymentFoundationOptions: {
        engineOptions: {
          idempotency: {
            service: {
              fingerprint: (payload) => JSON.stringify(payload),
              async execute(_k, _p, handler) {
                return handler();
              },
            },
            repository: {},
          },
          transactions: { service: transactionService, repository: transactionRepository },
          audit: { service: { async record(e) { return { auditId: "audit-4a", ...e }; } }, repository: {} },
        },
      },
      webhookReconciliationOptions: {
        webhookIdempotencyRepository: idempotencyRepository,
      },
    });

    runtime.paymentModule.configureChargeInfrastructure({
      transactionLinkService: runtime.transactionLinkService,
      paymentChargeRouter: new PaymentChargeRouter({
        paymentService,
        foundationBridge: runtime.paymentModule.getPaymentFoundationBridge(),
        routingPolicy: runtime.legacyRoutingPolicy,
        transactionService: runtime.paymentFoundation.engine.transactionService,
        transactionLinkService: runtime.transactionLinkService,
      }),
    });

    const charge = await runtime.paymentModule.createRoutedOrderPayment(
      {
        orderId: "order-4a-1",
        userId: "buyer-4a",
        sellerId: "seller-4a",
        amount: 1500,
        currency: "RWF",
        method: "MTN_MOMO",
        country: "RW",
      },
      { correlationId: "corr-4a-chain" }
    );

    assert.equal(charge.chargePath, "legacy");
    assert.equal(charge.correlationId, "corr-4a-chain");
    assert.ok(charge.link);
    assert.equal(charge.link.providerReference, "prov-4a-1");

    const seeded = transactionRepository.store[0];
    assert.equal(seeded.status, PaymentTransactionStatus.PENDING);

    const webhook = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/MTN_MOMO",
      body: {
        event: "payment.completed",
        eventId: "evt-4a-1",
        reference: "prov-4a-1",
        timestamp: new Date().toISOString(),
      },
      headers: { "x-correlation-id": "corr-http-different" },
    });

    assert.equal(webhook.status, 202);
    assert.equal(webhook.body.data.correlationId, "corr-4a-chain");
    assert.equal(webhook.body.data.reconciled, true);
    assert.equal(webhook.body.data.currentStatus, "CAPTURED");
    assert.equal(webhook.body.data.transactionId, charge.link.module2TransactionId);
    assert.equal(transactionRepository.store[0].status, "CAPTURED");
  });
});
