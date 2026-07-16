const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const ProviderTokenCache = require("../ProviderTokenCache");
const { createMockTransport, oauthSuccess } = require("./mockHttp");

describe("MTN MoMo OAuth", () => {
  const env = {
    MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
    MTN_MOMO_API_USER: "api-user",
    MTN_MOMO_API_KEY: "api-key",
  };

  it("acquires and caches OAuth token", async () => {
    let callCount = 0;
    const transport = createMockTransport([
      () => {
        callCount += 1;
        return oauthSuccess();
      },
    ]);

    const credentialStore = RuntimeFactory.createCredentialStore({
      providers: [new EnvironmentCredentialProvider({ env })],
    });
    const tokenCache = new ProviderTokenCache();
    const httpClient = RuntimeFactory.createHttpClient({ transport });
    const runtime = RuntimeFactory.createMtnMoMoRuntime({
      credentialStore,
      tokenCache,
      transport,
    });

    const token1 = await runtime.oauthClient.acquireToken("collection");
    const token2 = await runtime.oauthClient.acquireToken("collection");

    assert.equal(token1.accessToken, "mock-access-token");
    assert.equal(token2.accessToken, "mock-access-token");
    assert.equal(callCount, 1);
  });

  it("uses Basic auth and subscription key headers", async () => {
    let captured;
    const transport = createMockTransport([
      (req) => {
        captured = req;
        return oauthSuccess();
      },
    ]);

    const runtime = RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });

    await runtime.oauthClient.acquireToken("collection");
    assert.match(captured.headers.Authorization, /^Basic /);
    assert.equal(captured.headers["Ocp-Apim-Subscription-Key"], "sub-key");
    assert.match(captured.url, /\/collection\/token\/$/);
  });

  it("uses disbursement OAuth endpoint for disbursement scope", async () => {
    const captured = [];
    const transport = createMockTransport([
      (req) => {
        captured.push(req);
        return oauthSuccess({ access_token: "disbursement-token" });
      },
      (req) => {
        captured.push(req);
        return oauthSuccess({ access_token: "disbursement-token-2" });
      },
    ]);

    const runtime = RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });

    await runtime.oauthClient.acquireToken("disbursement");
    await runtime.oauthClient.acquireToken("collection");

    assert.match(captured[0].url, /\/disbursement\/token\/$/);
    assert.match(captured[1].url, /\/collection\/token\/$/);
    assert.equal(captured.length, 2);
  });

  it("caches collection and disbursement tokens separately", async () => {
    let callCount = 0;
    const transport = createMockTransport([
      () => {
        callCount += 1;
        return oauthSuccess({ access_token: "disbursement-token" });
      },
      () => {
        callCount += 1;
        return oauthSuccess({ access_token: "collection-token" });
      },
    ]);

    const runtime = RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport,
    });

    const disbursement1 = await runtime.oauthClient.acquireToken("disbursement");
    const collection1 = await runtime.oauthClient.acquireToken("collection");
    const disbursement2 = await runtime.oauthClient.acquireToken("disbursement");
    const collection2 = await runtime.oauthClient.acquireToken("collection");

    assert.equal(disbursement1.accessToken, "disbursement-token");
    assert.equal(collection1.accessToken, "collection-token");
    assert.equal(disbursement2.accessToken, "disbursement-token");
    assert.equal(collection2.accessToken, "collection-token");
    assert.equal(callCount, 2);
  });
});
