const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RetryPolicy = require("../RetryPolicy");
const ExponentialBackoffRetryPolicy = require("../ExponentialBackoffRetryPolicy");

describe("RetryPolicy", () => {
  it("assertImplements validates contract", () => {
    const policy = new ExponentialBackoffRetryPolicy();
    assert.doesNotThrow(() => RetryPolicy.assertImplements(policy));
  });

  it("reference policy computes retry decisions without executing retries", () => {
    const policy = new ExponentialBackoffRetryPolicy({ maxAttempts: 3, baseDelayMs: 100 });

    assert.equal(policy.maxAttempts(), 3);
    assert.equal(policy.shouldRetry({ attempt: 1, error: new Error("fail") }), true);
    assert.equal(policy.shouldRetry({ attempt: 3, error: new Error("fail") }), false);

    const delay = policy.nextDelay({ attempt: 2 });
    assert.ok(delay >= 100);
    assert.ok(delay <= 5000);

    const failure = policy.onFailure({ attempt: 3, error: new Error("terminal") });
    assert.equal(failure.policy, "exponential_backoff");
  });

  it("base RetryPolicy methods throw when not implemented", () => {
    const base = new RetryPolicy();
    assert.throws(() => base.shouldRetry({}), /must be implemented/);
    assert.throws(() => base.maxAttempts(), /must be implemented/);
    assert.throws(() => base.nextDelay({}), /must be implemented/);
  });
});
