const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const ProviderCredentialStore = require("../ProviderCredentialStore");
const ProviderCredentialError = require("../errors/ProviderCredentialError");

describe("ProviderCredentialStore", () => {
  it("loads MTN MoMo credentials from environment", async () => {
    const store = new ProviderCredentialStore([
      new EnvironmentCredentialProvider({
        env: {
          MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
          MTN_MOMO_API_USER: "api-user",
          MTN_MOMO_API_KEY: "api-key",
        },
      }),
    ]);

    const result = await store.load("MTN_MOMO");
    assert.equal(result.found, true);
    assert.equal(result.source, "environment");
    assert.equal(result.credentials.subscriptionKey, "sub-key");
    assert.equal(result.credentials.apiUser, "api-user");
    assert.equal(result.credentials.apiKey, "api-key");
  });

  it("loads Paypack credentials from environment", async () => {
    const store = new ProviderCredentialStore([
      new EnvironmentCredentialProvider({
        env: {
          PAYPACK_CLIENT_ID: "client-id",
          PAYPACK_CLIENT_SECRET: "client-secret",
        },
      }),
    ]);

    const result = await store.load("PAYPACK");
    assert.equal(result.found, true);
    assert.equal(result.credentials.clientId, "client-id");
  });

  it("throws when required credentials missing", async () => {
    const store = RuntimeFactory.createCredentialStore({
      providers: [new EnvironmentCredentialProvider({ env: {} })],
    });

    await assert.rejects(() => store.load("MTN_MOMO", { required: true }), ProviderCredentialError);
  });
});
