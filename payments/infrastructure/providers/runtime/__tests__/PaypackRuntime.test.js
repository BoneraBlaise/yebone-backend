const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const PaypackRuntimeAdapter = require("../paypack/PaypackRuntimeAdapter");
const { createMockTransport, oauthSuccess } = require("./mockHttp");

describe("Paypack Runtime", () => {
  const env = {
    PAYPACK_CLIENT_ID: "client-id",
    PAYPACK_CLIENT_SECRET: "client-secret",
  };

  it("satisfies ProviderAdapterInterface contract", () => {
    const transport = createMockTransport([oauthSuccess({ access: "paypack-token" })]);
    const runtime = RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });
    assert.doesNotThrow(() => PaypackRuntimeAdapter.assertContract(runtime));
  });

  it("authenticates and normalizes charge without production calls", async () => {
    const transport = createMockTransport([oauthSuccess({ access: "paypack-token" })]);
    const runtime = RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });

    const response = await runtime.charge({
      reference: "order-200",
      amount: 1000,
      currency: "RWF",
    });

    assert.equal(response.success, true);
    assert.equal(response.mock, false);
    assert.equal(response.status, "AUTH_READY");
    assert.equal(response.metadata.sandbox, true);
    assert.equal(response.data.productionCallsBlocked, true);
  });

  it("maps auth failure to ProviderError", async () => {
    const transport = createMockTransport([{ status: 401, body: { message: "Unauthorized" } }]);
    const runtime = RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });

    const response = await runtime.charge({
      reference: "order-fail",
      amount: 500,
      currency: "RWF",
    });

    assert.equal(response.success, false);
    assert.equal(response.error.code, "PROVIDER_HTTP_401");
  });
});
