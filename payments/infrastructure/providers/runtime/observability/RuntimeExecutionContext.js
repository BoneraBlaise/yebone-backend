/**
 * Extracts per-request observability context propagated from ProviderExecutionOrchestrator.
 */
function resolveRuntimeExecutionContext(request = {}) {
  return Object.freeze({
    metrics: request.metadata?.runtimeMetrics || null,
    correlationId: request.metadata?.correlationId || request.correlationId || null,
  });
}

module.exports = {
  resolveRuntimeExecutionContext,
};
