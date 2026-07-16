const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  METRIC_NAMES,
  ProviderRuntimeMetrics,
} = require("../observability/ProviderRuntimeMetrics");

describe("ProviderRuntimeMetrics", () => {
  it("tracks design-only in-memory counters", () => {
    const metrics = new ProviderRuntimeMetrics();
    metrics.increment("oauth_cache_hit");
    metrics.increment("oauth_cache_miss", 2);
    metrics.increment("provider_retry");
    metrics.increment("provider_timeout");
    metrics.increment("provider_success");
    metrics.increment("provider_failure");
    metrics.increment("runtime_mock");
    metrics.increment("runtime_http");
    metrics.observeDuration(125);

    const snapshot = metrics.snapshot();
    assert.equal(snapshot.oauth_cache_hit, 1);
    assert.equal(snapshot.oauth_cache_miss, 2);
    assert.equal(snapshot.provider_duration, 125);
    assert.equal(snapshot.runtime_http, 1);
  });

  it("rejects unknown metric names", () => {
    const metrics = new ProviderRuntimeMetrics();
    assert.throws(() => metrics.increment("unknown_metric"), /unknown metric/);
  });

  it("includes all required metric names", () => {
    for (const name of [
      "oauth_cache_hit",
      "oauth_cache_miss",
      "provider_retry",
      "provider_timeout",
      "provider_success",
      "provider_failure",
      "provider_duration",
      "runtime_mock",
      "runtime_http",
    ]) {
      assert.ok(METRIC_NAMES.includes(name));
    }
  });
});
