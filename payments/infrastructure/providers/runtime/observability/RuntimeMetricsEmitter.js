/**
 * Minimal metric emission helper — supports diagnostics collectors and ProviderRuntimeMetrics.
 */
function emitRuntimeMetric(metrics, name, value = 1) {
  if (!metrics || !name) {
    return;
  }
  if (typeof metrics.incrementCounter === "function") {
    metrics.incrementCounter(name, value);
    return;
  }
  if (typeof metrics.increment === "function") {
    metrics.increment(name, value);
  }
}

function observeRuntimeDuration(metrics, durationMs) {
  if (!metrics) {
    return;
  }
  if (typeof metrics.observeProviderDuration === "function") {
    metrics.observeProviderDuration(durationMs);
    return;
  }
  if (typeof metrics.increment === "function") {
    metrics.increment("provider_duration", durationMs);
  }
}

module.exports = {
  emitRuntimeMetric,
  observeRuntimeDuration,
};
