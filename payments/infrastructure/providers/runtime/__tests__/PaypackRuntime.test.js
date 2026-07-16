const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const PaypackRuntimeAdapter = require("../paypack/PaypackRuntimeAdapter");
const { createRoutingTransport, paypackSandboxRoutes } = require("./mockHttp");

describe("Paypack Runtime", () => {
  const env = {
    PAYPACK_CLIENT_ID: "client-id",
    PAYPACK_CLIENT_SECRET: "client-secret",
  };

  function createRuntime() {
    return RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport: createRoutingTransport(paypackSandboxRoutes()),
    });
  }

  it("satisfies ProviderAdapterInterface contract", () => {
    const runtime = createRuntime();
    assert.doesNotThrow(() => PaypackRuntimeAdapter.assertContract(runtime));
  });

  it("executes sandbox cash-in charge via mock HTTP", async () => {
    const runtime = createRuntime();
    const response = await runtime.charge({
      reference: "order-200",
      amount: 1000,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    assert.equal(response.success, true);
    assert.equal(response.mock, false);
    assert.equal(response.status, "PENDING");
    assert.equal(response.metadata.sandbox, true);
  });

  it("maps auth failure to ProviderError", async () => {
    const transport = createRoutingTransport([
      {
        match: ({ url }) => url.includes("/auth/agents/authorize"),
        respond: () => ({ status: 401, body: { message: "Unauthorized" } }),
      },
    ]);

    const runtime = RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });

    const response = await runtime.charge({
      reference: "order-fail",
      amount: 500,
      currency: "RWF",
      metadata: { msisdn: "0781234567" },
    });

    assert.equal(response.success, false);
    assert.equal(response.error.code, "PROVIDER_HTTP_401");
  });
});
