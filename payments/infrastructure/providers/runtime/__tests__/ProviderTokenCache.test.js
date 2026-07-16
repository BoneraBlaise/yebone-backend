const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderTokenCache = require("../ProviderTokenCache");

describe("ProviderTokenCache", () => {
  it("isolates tokens by provider and scope", () => {
    const cache = new ProviderTokenCache();
    cache.set("MTN_MOMO", "collection", { accessToken: "mtn-collection" });
    cache.set("MTN_MOMO", "disbursement", { accessToken: "mtn-disbursement" });
    cache.set("PAYPACK", "default", { accessToken: "paypack-token" });

    assert.equal(cache.get("MTN_MOMO", "collection").accessToken, "mtn-collection");
    assert.equal(cache.get("MTN_MOMO", "disbursement").accessToken, "mtn-disbursement");
    assert.equal(cache.get("PAYPACK", "default").accessToken, "paypack-token");
    assert.equal(cache.get("MTN_MOMO", "missing"), null);
  });

  it("returns frozen token objects", () => {
    const cache = new ProviderTokenCache();
    cache.set("MTN_MOMO", "collection", { accessToken: "token" });
    const token = cache.get("MTN_MOMO", "collection");
    assert.equal(Object.isFrozen(token), true);
  });

  it("expires tokens after ttl", () => {
    const cache = new ProviderTokenCache();
    const originalNow = Date.now;
    Date.now = () => 1_000_000;

    cache.set("MTN_MOMO", "collection", { accessToken: "token" }, 120);
    Date.now = () => 1_000_000 + 61_000;
    assert.equal(cache.get("MTN_MOMO", "collection"), null);

    Date.now = originalNow;
  });

  it("clears by scope or entire provider", () => {
    const cache = new ProviderTokenCache();
    cache.set("MTN_MOMO", "collection", { accessToken: "c" });
    cache.set("MTN_MOMO", "disbursement", { accessToken: "d" });

    cache.clear("MTN_MOMO", "collection");
    assert.equal(cache.get("MTN_MOMO", "collection"), null);
    assert.ok(cache.get("MTN_MOMO", "disbursement"));

    cache.clear("MTN_MOMO");
    assert.equal(cache.get("MTN_MOMO", "disbursement"), null);
  });

  it("normalizes provider code case in cache keys", () => {
    const cache = new ProviderTokenCache();
    cache.set("mtn_momo", "Collection", { accessToken: "token" });
    assert.equal(cache.get("MTN_MOMO", "collection").accessToken, "token");
  });
});
