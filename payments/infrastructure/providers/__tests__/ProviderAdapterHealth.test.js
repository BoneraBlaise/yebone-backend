const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  ProviderAdapterHealthContract,
  ProviderHealthStatus,
} = require("../ProviderAdapterHealthContract");
const { createProviderFoundation, enableMtn } = require("./testHelpers");

describe("ProviderAdapterHealthContract", () => {
  let foundation;

  beforeEach(() => {
    foundation = createProviderFoundation();
  });

  it("reports UNREGISTERED for unknown provider codes", () => {
    const health = ProviderAdapterHealthContract.build({
      registry: foundation.providerRegistry,
      featureFlags: foundation.featureFlags,
      providerCode: "UNKNOWN",
    });
    assert.equal(health.status, ProviderHealthStatus.UNREGISTERED);
    assert.equal(health.executable, false);
  });

  it("reports DISABLED when adapter exists but flags are off", () => {
    const health = ProviderAdapterHealthContract.build({
      registry: foundation.providerRegistry,
      featureFlags: foundation.featureFlags,
      providerCode: "MTN_MOMO",
    });
    assert.equal(health.status, ProviderHealthStatus.DISABLED);
    assert.equal(health.adapterRegistered, true);
    assert.equal(health.featureFlagEnabled, false);
  });

  it("reports READY when registry and feature flags are enabled", () => {
    enableMtn(foundation);
    const health = ProviderAdapterHealthContract.build({
      registry: foundation.providerRegistry,
      featureFlags: foundation.featureFlags,
      providerCode: "MTN_MOMO",
    });
    assert.equal(health.status, ProviderHealthStatus.READY);
    assert.equal(health.executable, true);
  });

  it("builds health snapshots for all registered providers", () => {
    const all = ProviderAdapterHealthContract.buildAll({
      registry: foundation.providerRegistry,
      featureFlags: foundation.featureFlags,
    });
    assert.ok(all.length >= 5);
    assert.ok(all.every((entry) => entry.providerCode));
  });
});
