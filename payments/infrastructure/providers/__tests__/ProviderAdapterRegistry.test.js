const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createProviderFoundation } = require("./testHelpers");
const ProviderAdapterConfig = require("../ProviderAdapterConfig");

describe("ProviderAdapterRegistry", () => {
  let foundation;

  beforeEach(() => {
    foundation = createProviderFoundation();
  });

  it("registers default skeleton adapters for all supported providers", () => {
    for (const code of ProviderAdapterConfig.supportedProviderCodes) {
      const adapter = foundation.adapterRegistry.getAdapter(code);
      assert.ok(adapter, `expected adapter for ${code}`);
      assert.equal(adapter.providerCode, code);
    }
  });

  it("attaches adapters to ProviderRegistry descriptors", () => {
    const entry = foundation.providerRegistry.resolve("FLUTTERWAVE");
    assert.ok(entry.adapter);
    assert.equal(entry.adapter.providerCode, "FLUTTERWAVE");
  });

  it("leaves providers disabled by default after registration", () => {
    const entry = foundation.providerRegistry.resolve("STRIPE");
    assert.equal(entry.enabled, false);
  });
});
