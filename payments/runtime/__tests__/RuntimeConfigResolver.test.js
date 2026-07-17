const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeConfigResolver = require("../config/RuntimeConfigResolver");

describe("RuntimeConfigResolver", () => {
  it("returns empty overrides when env is unset", () => {
    const resolved = RuntimeConfigResolver.resolve({}, {});
    assert.equal(Object.keys(resolved).length, 0);
  });

  it("resolves compose, webhook, and rollout flags from env", () => {
    const resolved = RuntimeConfigResolver.resolve({
      PAYMENT_COMPOSE_FOUNDATION: "true",
      PAYMENT_ENABLE_WEBHOOKS: "yes",
      PAYMENT_APPLY_FEATURE_FLAG_ROLLOUT: "on",
    });

    assert.equal(resolved.composePaymentFoundation, true);
    assert.equal(resolved.enableWebhooks, true);
    assert.equal(resolved.applyFeatureFlagRollout, true);
  });

  it("disables flags when env is explicitly false", () => {
    const resolved = RuntimeConfigResolver.resolve(
      { PAYMENT_ENABLE_WEBHOOKS: "false" },
      { enableWebhooks: true }
    );
    assert.equal(resolved.enableWebhooks, false);
  });

  it("documents supported env keys", () => {
    const keys = RuntimeConfigResolver.describeEnvKeys();
    assert.ok(keys.includes("PAYMENT_COMPOSE_FOUNDATION"));
    assert.ok(keys.includes("PAYMENT_ENABLE_WEBHOOKS"));
  });
});
