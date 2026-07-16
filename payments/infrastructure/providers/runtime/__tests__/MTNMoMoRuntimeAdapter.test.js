const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const MTNMoMoRuntimeAdapter = require("../mtn/MTNMoMoRuntimeAdapter");
const {
  createRoutingTransport,
  mtnMoMoSandboxRoutes,
} = require("./mockHttp");

describe("MTN MoMo RuntimeAdapter", () => {
  const env = {
    MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
    MTN_MOMO_API_USER: "api-user",
    MTN_MOMO_API_KEY: "api-key",
  };

  function createRuntime() {
    const transport = createRoutingTransport(mtnMoMoSandboxRoutes());

    return RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });
  }

  it("satisfies ProviderAdapterInterface contract", () => {
    const runtime = createRuntime();
    assert.doesNotThrow(() => MTNMoMoRuntimeAdapter.assertContract(runtime));
  });

  it("executes sandbox collection charge via mock HTTP", async () => {
    const runtime = createRuntime();
    const response = await runtime.charge({
      reference: "order-100",
      amount: 2500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    assert.equal(response.success, true);
    assert.equal(response.mock, false);
    assert.equal(response.providerCode, "MTN_MOMO");
    assert.equal(response.status, "PENDING");
    assert.equal(response.metadata.sandbox, true);
    assert.match(response.metadata.correlationId, /.+/);
  });

  it("verifies collection status", async () => {
    const runtime = createRuntime();
    await runtime.charge({
      reference: "order-100",
      amount: 2500,
      currency: "RWF",
      metadata: { msisdn: "250788123456" },
    });

    const verifyResponse = await runtime.verify({
      reference: "order-100",
      metadata: { providerReference: "order-100" },
    });

    assert.equal(verifyResponse.success, true);
    assert.equal(verifyResponse.status, "SUCCESSFUL");
    assert.equal(verifyResponse.externalReference, "fin-txn-123");
  });

  it("reports sandbox runtime health", () => {
    const runtime = createRuntime();
    const health = runtime.health();
    assert.equal(health.status, "RUNTIME_SANDBOX");
    assert.equal(health.executable, false);
    assert.equal(health.sandbox, true);
  });
});
