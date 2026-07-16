const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const ProviderTokenCache = require("../ProviderTokenCache");
const ProviderEnvironmentResolver = require("../ProviderEnvironmentResolver");
const PaypackRuntimeAdapter = require("../paypack/PaypackRuntimeAdapter");
const PaypackRefundClient = require("../paypack/PaypackRefundClient");
const PaypackCredentials = require("../paypack/PaypackCredentials");
const {
  createRoutingTransport,
  createMockTransport,
  paypackSandboxRoutes,
  paypackAuthSuccess,
} = require("./mockHttp");

describe("Paypack Sandbox Runtime (Phase 2C)", () => {
  const env = {
    PAYPACK_CLIENT_ID: "client-id",
    PAYPACK_CLIENT_SECRET: "client-secret",
    PAYPACK_APP_ID: "app-id-123",
  };

  function createRuntime(options = {}) {
    return RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env: options.env || env })],
      transport: options.transport || createRoutingTransport(paypackSandboxRoutes()),
      tokenCache: options.tokenCache,
    });
  }

  it("satisfies ProviderAdapterInterface contract", () => {
    const runtime = createRuntime();
    assert.doesNotThrow(() => PaypackRuntimeAdapter.assertContract(runtime));
  });

  it("executes cash-in charge with auth token and idempotency header", async () => {
    const captured = [];
    const transport = createRoutingTransport([
      {
        match: ({ method, url }) => method === "POST" && url.includes("/transactions/cashin"),
        respond: (req) => {
          captured.push(req);
          return { status: 200, body: { ref: "paypack-ref-123", status: "pending" } };
        },
      },
      ...paypackSandboxRoutes(),
    ]);

    const runtime = createRuntime({ transport });
    const response = await runtime.charge({
      reference: "order-300",
      amount: 2500,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    assert.equal(response.success, true);
    assert.equal(response.operation, "charge");
    assert.equal(response.status, "PENDING");
    assert.match(response.metadata.providerIdempotencyKey, /^pidem_paypack_/);
    assert.equal(captured.length, 1);
    assert.match(captured[0].headers.Authorization, /^Bearer /);
    assert.match(captured[0].headers["Idempotency-Key"], /^pidem_paypack_/);
  });

  it("executes checkout session when metadata.product is checkout", async () => {
    const runtime = createRuntime();
    const response = await runtime.charge({
      reference: "checkout-order-1",
      amount: 5000,
      currency: "RWF",
      metadata: {
        product: "checkout",
        email: "buyer@example.com",
        appId: "app-id-123",
      },
    });

    assert.equal(response.success, true);
    assert.equal(response.status, "PENDING");
    assert.equal(response.data.sessionId, "checkout-session-789");
    assert.match(response.data.paymentLink, /checkout\.paypack\.rw/);
  });

  it("verifies transaction status via find endpoint", async () => {
    const runtime = createRuntime();
    const chargeResponse = await runtime.charge({
      reference: "order-301",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    const verifyResponse = await runtime.verify({
      reference: "order-301",
      metadata: {
        providerReference: chargeResponse.data.transactionRef || "paypack-ref-123",
      },
    });

    assert.equal(verifyResponse.success, true);
    assert.equal(verifyResponse.status, "SUCCESSFUL");
    assert.equal(verifyResponse.operation, "verify");
    assert.equal(verifyResponse.metadata.sandbox, true);
  });

  it("executes cash-out payout", async () => {
    const runtime = createRuntime();
    const response = await runtime.payout({
      reference: "payout-300",
      amount: 3000,
      currency: "RWF",
      metadata: { msisdn: "0787654321" },
    });

    assert.equal(response.success, true);
    assert.equal(response.operation, "payout");
    assert.equal(response.status, "PENDING");
    assert.match(response.metadata.providerIdempotencyKey, /^pidem_paypack_/);
  });

  it("reuses OAuth token from ProviderTokenCache", async () => {
    let authCalls = 0;
    const transport = createRoutingTransport([
      {
        match: ({ url }) => url.includes("/auth/agents/authorize"),
        respond: () => {
          authCalls += 1;
          return paypackAuthSuccess();
        },
      },
      ...paypackSandboxRoutes().filter((route) => !String(route.match).includes("authorize")),
    ]);

    const tokenCache = new ProviderTokenCache();
    const runtime = createRuntime({ transport, tokenCache });

    await runtime.charge({
      reference: "order-cache-a",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });
    await runtime.charge({
      reference: "order-cache-b",
      amount: 2000,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    assert.equal(authCalls, 1);
  });

  it("expires OAuth cache and refetches token", async () => {
    let authCalls = 0;
    const transport = createMockTransport([
      () => {
        authCalls += 1;
        return paypackAuthSuccess({ expires_in: 120 });
      },
      () => {
        authCalls += 1;
        return paypackAuthSuccess({ access: "refreshed-token", expires_in: 120 });
      },
    ]);

    const tokenCache = new ProviderTokenCache();
    const runtime = createRuntime({ transport, tokenCache });
    const originalNow = Date.now;
    Date.now = () => 1_000_000;

    await runtime.authClient.acquireToken("default");
    Date.now = () => 1_000_000 + 61_000;
    await runtime.authClient.acquireToken("default");

    Date.now = originalNow;
    assert.equal(authCalls, 2);
  });

  it("returns refund stub failure without HTTP", async () => {
    let httpCalled = false;
    const transport = async () => {
      httpCalled = true;
      return paypackAuthSuccess();
    };

    const runtime = createRuntime({ transport });
    const response = await runtime.refund({ reference: "refund-1" });

    assert.equal(response.success, false);
    assert.equal(httpCalled, false);
  });

  it("refund client throws PAYPACK_REFUND_NOT_IMPLEMENTED", async () => {
    const refundClient = new PaypackRefundClient();
    await assert.rejects(() => refundClient.refund(), /not implemented/i);
  });

  it("blocks live HTTP when transport is not injected", async () => {
    const runtime = RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
    });

    const response = await runtime.charge({
      reference: "blocked-order",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    assert.equal(response.success, false);
  });

  it("environment resolver rejects non-sandbox environments", () => {
    const resolver = new ProviderEnvironmentResolver();
    assert.throws(() => resolver.resolve("PAYPACK", "production"), /blocked/);
  });

  it("resolves client credentials from environment", async () => {
    const store = RuntimeFactory.createCredentialStore({
      providers: [new EnvironmentCredentialProvider({ env })],
    });
    const result = await store.load("PAYPACK");
    const resolved = PaypackCredentials.resolve(result);

    assert.equal(resolved.auth.clientId, "client-id");
    assert.equal(resolved.auth.clientSecret, "client-secret");
    assert.equal(resolved.auth.mode, "client_credentials");
  });

  it("resolves username/password credentials when client credentials absent", async () => {
    const store = RuntimeFactory.createCredentialStore({
      providers: [
        new EnvironmentCredentialProvider({
          env: {
            PAYPACK_USERNAME: "agent-user",
            PAYPACK_PASSWORD: "agent-pass",
          },
        }),
      ],
    });
    const result = await store.load("PAYPACK");
    const resolved = PaypackCredentials.resolve(result);

    assert.equal(resolved.auth.mode, "password");
    assert.equal(resolved.auth.username, "agent-user");
  });

  it("generates provider references through charge normalization", async () => {
    const runtime = createRuntime();
    const response = await runtime.charge({
      reference: "order-ref-paypack",
      amount: 900,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    assert.match(response.externalReference, /.+/);
    assert.equal(response.metadata.providerReferenceMerchant, "order-ref-paypack");
  });
});
