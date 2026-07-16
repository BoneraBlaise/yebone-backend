const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const MTNMoMoCredentials = require("../mtn/MTNMoMoCredentials");
const PaypackCredentials = require("../paypack/PaypackCredentials");

describe("EnvironmentCredentialProvider product-scoped credentials", () => {
  it("loads MTN collection and disbursement product keys", async () => {
    const provider = new EnvironmentCredentialProvider({
      env: {
        MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY: "col-sub",
        MTN_MOMO_COLLECTION_API_USER: "col-user",
        MTN_MOMO_COLLECTION_API_KEY: "col-key",
        MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY: "dis-sub",
        MTN_MOMO_DISBURSEMENT_API_USER: "dis-user",
        MTN_MOMO_DISBURSEMENT_API_KEY: "dis-key",
      },
    });

    const result = await provider.getCredentials("MTN_MOMO");
    assert.equal(result.found, true);
    assert.equal(result.credentials.collection.subscriptionKey, "col-sub");
    assert.equal(result.credentials.disbursement.subscriptionKey, "dis-sub");

    const collection = MTNMoMoCredentials.resolveScope(result, "collection");
    const disbursement = MTNMoMoCredentials.resolveScope(result, "disbursement");
    assert.equal(collection.apiKey, "col-key");
    assert.equal(disbursement.apiKey, "dis-key");
  });

  it("loads Paypack default and checkout product keys", async () => {
    const provider = new EnvironmentCredentialProvider({
      env: {
        PAYPACK_DEFAULT_CLIENT_ID: "default-id",
        PAYPACK_DEFAULT_CLIENT_SECRET: "default-secret",
        PAYPACK_CHECKOUT_CLIENT_ID: "checkout-id",
        PAYPACK_CHECKOUT_CLIENT_SECRET: "checkout-secret",
        PAYPACK_CHECKOUT_APP_ID: "checkout-app",
      },
    });

    const result = await provider.getCredentials("PAYPACK");
    assert.equal(result.found, true);

    const defaultProduct = PaypackCredentials.resolveProduct(result, "default");
    const checkoutProduct = PaypackCredentials.resolveProduct(result, "checkout");
    assert.equal(defaultProduct.clientId, "default-id");
    assert.equal(checkoutProduct.clientId, "checkout-id");
    assert.equal(checkoutProduct.appId, "checkout-app");
  });

  it("falls back to legacy MTN and Paypack env keys", async () => {
    const provider = new EnvironmentCredentialProvider({
      env: {
        MTN_MOMO_SUBSCRIPTION_KEY: "legacy-sub",
        MTN_MOMO_API_USER: "legacy-user",
        MTN_MOMO_API_KEY: "legacy-key",
        PAYPACK_CLIENT_ID: "legacy-id",
        PAYPACK_CLIENT_SECRET: "legacy-secret",
      },
    });

    const mtn = await provider.getCredentials("MTN_MOMO");
    const paypack = await provider.getCredentials("PAYPACK");
    assert.equal(mtn.found, true);
    assert.equal(paypack.found, true);
    assert.equal(mtn.credentials.collection.subscriptionKey, "legacy-sub");
    assert.equal(paypack.credentials.default.clientId, "legacy-id");
  });
});
