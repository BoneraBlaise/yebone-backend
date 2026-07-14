const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const IdempotencyHelper = require("../IdempotencyHelper");
const IdempotencyMiddleware = require("../IdempotencyMiddleware");

describe("IdempotencyHelper", () => {
  it("produces stable fingerprints regardless of key order", () => {
    const a = IdempotencyHelper.fingerprint({ amount: 100, orderId: "o1" });
    const b = IdempotencyHelper.fingerprint({ orderId: "o1", amount: 100 });
    assert.equal(a, b);
  });

  it("matches legacy in-memory fingerprint for typical orchestrator payloads", () => {
    const payload = { orderId: "ord-99", amount: 15000, currency: "RWF" };
    const legacy = require("crypto")
      .createHash("sha256")
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest("hex");
    assert.equal(IdempotencyHelper.fingerprint(payload), legacy);
  });

  it("rejects empty idempotency keys", () => {
    assert.throws(() => IdempotencyHelper.normalizeKey(""), /required/);
  });

  it("extracts context from headers", () => {
    const req = {
      headers: {
        "idempotency-key": " key-1 ",
        "x-correlation-id": "corr-abc",
        "x-request-id": "req-xyz",
        "x-payment-reference": "pay-001",
      },
    };
    const ctx = IdempotencyHelper.extractContext(req);
    assert.equal(ctx.idempotencyKey, "key-1");
    assert.equal(ctx.correlationId, "corr-abc");
    assert.equal(ctx.requestId, "req-xyz");
    assert.equal(ctx.paymentReference, "pay-001");
  });

  it("throws when requireKey and header missing", () => {
    assert.throws(
      () => IdempotencyHelper.extractContext({ headers: {} }, { requireKey: true }),
      /Idempotency-Key header is required/
    );
  });
});

describe("IdempotencyMiddleware", () => {
  it("attaches idempotencyContext to request", () => {
    const middleware = IdempotencyMiddleware.attach({ scope: "checkout" });
    const req = { headers: { "idempotency-key": "idem-1" } };
    const res = { setHeader() {} };
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.idempotencyContext.scope, "checkout");
    assert.equal(req.idempotencyContext.idempotencyKey, "idem-1");
  });

  it("returns 400 when key required but missing", () => {
    const middleware = IdempotencyMiddleware.attach({ requireKey: true });
    const req = { headers: {} };
    let statusCode;
    let body;
    const res = {
      setHeader() {},
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
      },
    };

    middleware(req, res, () => {});

    assert.equal(statusCode, 400);
    assert.equal(body.code, "IDEMPOTENCY_KEY_REQUIRED");
  });

  it("resolveKey prefers context then body", () => {
    const req = {
      idempotencyContext: { idempotencyKey: "from-header" },
      body: { idempotencyKey: "from-body" },
    };
    assert.equal(IdempotencyMiddleware.resolveKey(req), "from-header");
  });
});
