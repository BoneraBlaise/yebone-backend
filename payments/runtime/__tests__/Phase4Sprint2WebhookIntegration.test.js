const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { createHmac } = require("node:crypto");
const { registerPaymentRuntime } = require("../index");
const ProviderWebhookVerifier = require("../../infrastructure/providers/runtime/ProviderWebhookVerifier");

function createMemoryFoundationServices() {
  const idempotencyService = {
    fingerprint: (payload) => JSON.stringify(payload),
    async execute(_key, _payload, handler) {
      return handler();
    },
  };

  const transactionService = {
    async createTransaction(input) {
      return {
        transactionId: "txn_wh_1",
        paymentReference: input.paymentReference || "ref_wh_1",
        status: "CREATED",
        ...input,
      };
    },
  };

  const auditService = {
    async record(event) {
      return Object.freeze({ ...event });
    },
  };

  return {
    idempotency: { service: idempotencyService, repository: {}, cleanup: {} },
    transactions: { service: transactionService, repository: {} },
    audit: { service: auditService, repository: {} },
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

function createWebhookApp(configOverrides = {}) {
  const app = express();
  app.use(express.json());
  const memory = createMemoryFoundationServices();
  const { result } = registerPaymentRuntime(app, {
    config: {
      composePaymentFoundation: true,
      enableWebhooks: true,
      environment: "development",
      ...configOverrides,
    },
    paymentFoundationOptions: {
      engineOptions: {
        idempotency: memory.idempotency,
        transactions: memory.transactions,
        audit: memory.audit,
      },
    },
  });
  return { app, result };
}

describe("Phase 4 Sprint 2 webhook integration", () => {
  it("does not mount webhook routes when enableWebhooks is false", () => {
    const app = express();
    app.use(express.json());
    const { result } = registerPaymentRuntime(app, {
      config: { composePaymentFoundation: false, enableWebhooks: false },
    });

    const webhookEntry = result.startup.entries.find((e) => e.name === "webhook_routes_mounted");
    assert.equal(webhookEntry.status, "skipped");
  });

  it("mounts webhook routes when foundation is composed and webhooks enabled", () => {
    const { result } = createWebhookApp();
    const webhookEntry = result.startup.entries.find((e) => e.name === "webhook_routes_mounted");
    assert.equal(webhookEntry.status, "ok");
    assert.deepEqual(result.readiness.checks.webhookHandlersRegistered, true);
    assert.equal(result.readiness.checks.webhookRoutesEnabled, true);
  });

  it("accepts MTN webhook on MOCK path with correlation propagation", async () => {
    const { app } = createWebhookApp();
    const response = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/MTN_MOMO",
      body: { reference: "wh-ref-1", event: "payment.completed" },
      headers: { "x-correlation-id": "corr-wh-1" },
    });

    assert.equal(response.status, 202);
    assert.equal(response.body.correlationId, "corr-wh-1");
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.providerCode, "MTN_MOMO");
    assert.equal(response.body.data.executionMode, "MOCK");
    assert.equal(response.body.data.mock, true);
    assert.equal(response.body.data.reconciled, false);
  });

  it("accepts Paypack webhook with normalized provider code", async () => {
    const { app } = createWebhookApp();
    const response = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/paypack",
      body: { event: "checkout.completed" },
      headers: { "x-correlation-id": "corr-paypack-1" },
    });

    assert.equal(response.status, 202);
    assert.equal(response.body.correlationId, "corr-paypack-1");
    assert.equal(response.body.data.providerCode, "PAYPACK");
  });

  it("returns 404 for unregistered webhook provider", async () => {
    const { app } = createWebhookApp();
    const response = await httpRequest(app, {
      method: "POST",
      path: "/api/v1/payments/webhooks/STRIPE",
      body: { event: "test" },
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "WEBHOOK_HANDLER_NOT_FOUND");
    assert.ok(response.body.correlationId);
  });

  it("HMAC spike: stable JSON.stringify verification path is sufficient for Sprint 2", () => {
    const secret = "test-webhook-secret";
    const payloadObject = { reference: "hmac-ref", amount: 1000 };
    const payloadString = JSON.stringify(payloadObject);
    const signature = createHmac("sha256", secret).update(payloadString).digest("hex");

    const verifier = new ProviderWebhookVerifier("PAYPACK");
    const result = verifier.verifyWebhook({
      payload: payloadObject,
      rawPayload: payloadString,
      webhookSecret: secret,
      signature,
    });

    assert.equal(result.verified, true);
    assert.equal(result.cryptographyImplemented, true);
  });
});

describe("Phase 4 Sprint 2 env bootstrap", () => {
  it("registerPaymentRuntime merges env config without changing legacy defaults", () => {
    const originalCompose = process.env.PAYMENT_COMPOSE_FOUNDATION;
    const originalWebhooks = process.env.PAYMENT_ENABLE_WEBHOOKS;
    delete process.env.PAYMENT_COMPOSE_FOUNDATION;
    delete process.env.PAYMENT_ENABLE_WEBHOOKS;

    try {
      const app = express();
      app.use(express.json());
      const { runtime } = registerPaymentRuntime(app);
      assert.equal(runtime.config.composePaymentFoundation, false);
      assert.equal(runtime.config.enableWebhooks, false);
      assert.equal(runtime.paymentModule.isPaymentFoundationWired(), false);
    } finally {
      if (originalCompose !== undefined) {
        process.env.PAYMENT_COMPOSE_FOUNDATION = originalCompose;
      }
      if (originalWebhooks !== undefined) {
        process.env.PAYMENT_ENABLE_WEBHOOKS = originalWebhooks;
      }
    }
  });
});
