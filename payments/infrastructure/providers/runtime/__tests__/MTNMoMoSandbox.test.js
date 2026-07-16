const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const ProviderTokenCache = require("../ProviderTokenCache");
const ProviderEnvironmentResolver = require("../ProviderEnvironmentResolver");
const MTNMoMoRefundClient = require("../mtn/MTNMoMoRefundClient");
const MTNMoMoRuntimeAdapter = require("../mtn/MTNMoMoRuntimeAdapter");
const {
  createRoutingTransport,
  createMockTransport,
  mtnMoMoSandboxRoutes,
  oauthSuccess,
  collectionAccepted,
  collectionStatus,
  disbursementAccepted,
  disbursementStatus,
} = require("./mockHttp");

describe("MTN MoMo Sandbox Runtime (Phase 2B)", () => {
  const env = {
    MTN_MOMO_SUBSCRIPTION_KEY: "collection-sub-key",
    MTN_MOMO_API_USER: "collection-api-user",
    MTN_MOMO_API_KEY: "collection-api-key",
    MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY: "disbursement-sub-key",
    MTN_MOMO_DISBURSEMENT_API_USER: "disbursement-api-user",
    MTN_MOMO_DISBURSEMENT_API_KEY: "disbursement-api-key",
  };

  function createRuntime(options = {}) {
    return RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env: options.env || env })],
      transport: options.transport || createRoutingTransport(mtnMoMoSandboxRoutes()),
      tokenCache: options.tokenCache,
    });
  }

  it("executes collection RequestToPay with correlation and idempotency headers", async () => {
    const captured = [];
    const transport = createRoutingTransport([
      {
        match: ({ method, url }) => method === "POST" && url.includes("/requesttopay"),
        respond: (req) => {
          captured.push(req);
          return collectionAccepted();
        },
      },
      ...mtnMoMoSandboxRoutes(),
    ]);

    const runtime = createRuntime({ transport });
    const response = await runtime.charge({
      reference: "order-200",
      amount: 1500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(response.success, true);
    assert.equal(response.operation, "charge");
    assert.equal(response.status, "PENDING");
    assert.match(response.metadata.correlationId, /.+/);
    assert.match(response.metadata.providerIdempotencyKey, /^pidem_mtnmomo_/);
    assert.equal(captured.length, 1);
    assert.match(captured[0].headers["X-Correlation-Id"], /.+/);
    assert.match(captured[0].headers["X-Reference-Id"], /^pidem_mtnmomo_/);
  });

  it("verifies collection status using idempotency reference", async () => {
    const runtime = createRuntime();
    const chargeResponse = await runtime.charge({
      reference: "order-201",
      amount: 1500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    const verifyResponse = await runtime.verify({
      reference: "order-201",
      metadata: { idempotencyKey: chargeResponse.metadata.providerIdempotencyKey },
    });

    assert.equal(verifyResponse.success, true);
    assert.equal(verifyResponse.status, "SUCCESSFUL");
    assert.equal(verifyResponse.externalReference, "fin-txn-123");
    assert.equal(verifyResponse.metadata.product, "collection");
  });

  it("executes disbursement transfer with disbursement OAuth scope", async () => {
    const captured = [];
    const transport = createRoutingTransport([
      {
        match: ({ url }) => url.includes("/disbursement/token/"),
        respond: (req) => {
          captured.push({ phase: "oauth", ...req });
          return oauthSuccess({ access_token: "disbursement-token" });
        },
      },
      {
        match: ({ method, url }) => method === "POST" && url.includes("/disbursement/v1_0/transfer"),
        respond: (req) => {
          captured.push({ phase: "transfer", ...req });
          return disbursementAccepted();
        },
      },
      {
        match: ({ method, url }) => method === "GET" && url.includes("/disbursement/v1_0/transfer"),
        respond: () => disbursementStatus("SUCCESSFUL"),
      },
      {
        match: ({ url }) => url.includes("/collection/token/"),
        respond: () => oauthSuccess(),
      },
      {
        match: ({ method, url }) => method === "POST" && url.includes("/requesttopay"),
        respond: () => collectionAccepted(),
      },
      {
        match: ({ method, url }) => method === "GET" && url.includes("/requesttopay"),
        respond: () => collectionStatus("SUCCESSFUL"),
      },
    ]);

    const runtime = createRuntime({ transport });
    const response = await runtime.payout({
      reference: "payout-100",
      amount: 5000,
      currency: "RWF",
      metadata: { msisdn: "250788654321" },
    });

    assert.equal(response.success, true);
    assert.equal(response.operation, "payout");
    assert.equal(response.status, "PENDING");
    assert.match(response.metadata.providerIdempotencyKey, /^pidem_mtnmomo_/);
    assert.equal(captured.some((entry) => entry.phase === "oauth"), true);
    assert.equal(captured.some((entry) => entry.phase === "transfer"), true);
    const transfer = captured.find((entry) => entry.phase === "transfer");
    assert.equal(transfer.headers["Ocp-Apim-Subscription-Key"], "disbursement-sub-key");
  });

  it("verifies disbursement transfer status", async () => {
    const runtime = createRuntime();
    const payoutResponse = await runtime.payout({
      reference: "payout-101",
      amount: 5000,
      currency: "RWF",
      metadata: { msisdn: "250788654321" },
    });

    const verifyResponse = await runtime.verify({
      reference: "payout-101",
      metadata: {
        product: "disbursement",
        idempotencyKey: payoutResponse.metadata.providerIdempotencyKey,
      },
    });

    assert.equal(verifyResponse.success, true);
    assert.equal(verifyResponse.status, "SUCCESSFUL");
    assert.equal(verifyResponse.externalReference, "fin-disburse-456");
    assert.equal(verifyResponse.metadata.product, "disbursement");
  });

  it("reuses OAuth cache across repeated collection calls", async () => {
    let oauthCalls = 0;
    const transport = createRoutingTransport([
      {
        match: ({ url }) => url.includes("/collection/token/"),
        respond: () => {
          oauthCalls += 1;
          return oauthSuccess();
        },
      },
      {
        match: ({ method, url }) => method === "POST" && url.includes("/requesttopay"),
        respond: () => collectionAccepted(),
      },
      {
        match: ({ method, url }) => method === "GET" && url.includes("/requesttopay"),
        respond: () => collectionStatus("SUCCESSFUL"),
      },
      {
        match: ({ url }) => url.includes("/disbursement/token/"),
        respond: () => oauthSuccess({ access_token: "disbursement-token" }),
      },
      {
        match: ({ method, url }) => method === "POST" && url.includes("/disbursement/v1_0/transfer"),
        respond: () => disbursementAccepted(),
      },
      {
        match: ({ method, url }) => method === "GET" && url.includes("/disbursement/v1_0/transfer"),
        respond: () => disbursementStatus("SUCCESSFUL"),
      },
    ]);

    const tokenCache = new ProviderTokenCache();
    const runtime = createRuntime({ transport, tokenCache });

    await runtime.charge({
      reference: "order-cache-1",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });
    await runtime.charge({
      reference: "order-cache-2",
      amount: 2000,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(oauthCalls, 1);
  });

  it("expires OAuth cache and refetches token", async () => {
    let oauthCalls = 0;
    const transport = createMockTransport([
      () => {
        oauthCalls += 1;
        return oauthSuccess({ expires_in: 120 });
      },
      () => {
        oauthCalls += 1;
        return oauthSuccess({ access_token: "refreshed-token", expires_in: 120 });
      },
    ]);

    const tokenCache = new ProviderTokenCache();
    const runtime = createRuntime({ transport, tokenCache });
    const originalNow = Date.now;
    Date.now = () => 1_000_000;

    await runtime.oauthClient.acquireToken("collection");
    Date.now = () => 1_000_000 + 61_000;
    await runtime.oauthClient.acquireToken("collection");

    Date.now = originalNow;
    assert.equal(oauthCalls, 2);
  });

  it("returns refund architecture stub failure without HTTP", async () => {
    let httpCalled = false;
    const transport = async () => {
      httpCalled = true;
      return oauthSuccess();
    };

    const runtime = createRuntime({ transport });
    const response = await runtime.refund({ reference: "refund-1" });

    assert.equal(response.success, false);
    assert.equal(httpCalled, false);
    assert.match(String(response.error?.message || response.message || ""), /not implemented/i);
  });

  it("refund client throws NotImplemented architecture error", async () => {
    const refundClient = new MTNMoMoRefundClient();
    await assert.rejects(() => refundClient.refund(), /not implemented/i);
  });

  it("blocks live HTTP when transport is not injected", async () => {
    const runtime = RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
    });

    const response = await runtime.charge({
      reference: "blocked-order",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(response.success, false);
  });

  it("environment resolver rejects non-sandbox environments", () => {
    const resolver = new ProviderEnvironmentResolver();
    assert.throws(() => resolver.resolve("MTN_MOMO", "production"), /blocked/);
  });

  it("generates provider references through charge normalization", async () => {
    const runtime = createRuntime();
    const response = await runtime.charge({
      reference: "order-ref-1",
      amount: 900,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.match(response.externalReference, /^pidem_mtnmomo_/);
    assert.equal(response.metadata.providerReferenceMerchant, "order-ref-1");
  });

  it("satisfies ProviderAdapterInterface contract after Phase 2B extensions", () => {
    const runtime = createRuntime();
    assert.doesNotThrow(() => MTNMoMoRuntimeAdapter.assertContract(runtime));
  });
});
