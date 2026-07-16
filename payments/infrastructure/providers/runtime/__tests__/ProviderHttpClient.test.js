const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderHttpClient = require("../ProviderHttpClient");
const ProviderTimeoutPolicy = require("../ProviderTimeoutPolicy");
const ProviderRetryPolicy = require("../ProviderRetryPolicy");
const ProviderRequestSigner = require("../ProviderRequestSigner");
const ProviderHttpError = require("../errors/ProviderHttpError");
const ProviderTimeoutError = require("../errors/ProviderTimeoutError");
const { createMockTransport, oauthSuccess } = require("./mockHttp");

describe("ProviderHttpClient", () => {
  it("blocks live HTTP when no transport injected", async () => {
    const client = new ProviderHttpClient({
      timeoutPolicy: new ProviderTimeoutPolicy(),
      retryPolicy: new ProviderRetryPolicy(),
      signer: ProviderRequestSigner,
    });

    await assert.rejects(
      () => client.request({ providerCode: "MTN_MOMO", url: "https://example.com" }),
      (err) => err instanceof ProviderHttpError && err.code === "PROVIDER_HTTP_BLOCKED"
    );
  });

  it("executes mock transport for OAuth", async () => {
    const client = new ProviderHttpClient({
      transport: createMockTransport([oauthSuccess()]),
      timeoutPolicy: new ProviderTimeoutPolicy(),
      retryPolicy: new ProviderRetryPolicy(),
      signer: ProviderRequestSigner,
    });

    const response = await client.request({
      providerCode: "MTN_MOMO",
      operation: "oauth",
      method: "POST",
      url: "https://sandbox.momodeveloper.mtn.com/collection/token/",
      signing: { subscriptionKey: "sub-key" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.access_token, "mock-access-token");
  });

  it("retries OAuth on 503", async () => {
    let calls = 0;
    const client = new ProviderHttpClient({
      transport: async (req) => {
        calls += 1;
        if (calls === 1) {
          return { status: 503, body: { message: "unavailable" } };
        }
        return oauthSuccess();
      },
      timeoutPolicy: new ProviderTimeoutPolicy(),
      retryPolicy: new ProviderRetryPolicy({ maxRetries: 2 }),
      signer: ProviderRequestSigner,
    });

    const response = await client.request({
      providerCode: "MTN_MOMO",
      operation: "oauth",
      method: "POST",
      url: "https://sandbox.momodeveloper.mtn.com/collection/token/",
    });

    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  });

  it("times out slow responses", async () => {
    const client = new ProviderHttpClient({
      transport: createMockTransport([{ delayMs: 200, status: 200, body: {} }]),
      timeoutPolicy: new ProviderTimeoutPolicy({ defaultTimeoutMs: 50 }),
      retryPolicy: new ProviderRetryPolicy({ maxRetries: 0 }),
      signer: ProviderRequestSigner,
    });

    await assert.rejects(
      () =>
        client.request({
          providerCode: "MTN_MOMO",
          operation: "oauth",
          method: "POST",
          url: "https://sandbox.example.com/token",
        }),
      ProviderTimeoutError
    );
  });
});
