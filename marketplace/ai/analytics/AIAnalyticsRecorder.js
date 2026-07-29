/**
 * Shared analytics recording for gateway chat/search and service handlers.
 */
function analyticsFromProvider(providerResult = {}, base = {}) {
  const usage = providerResult.usage || {};
  const cost = providerResult.cost || {};
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  const totalTokens =
    usage.totalTokens || inputTokens + outputTokens;

  return {
    ...base,
    providerCost: cost.estimatedCostUsd || 0,
    tokenUsage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  };
}

async function recordAnalytics(platform, event = {}) {
  platform.metrics.recordRequest(event);
  if (event.tokenUsage) {
    platform.metrics.recordTokenUsage?.(event.tokenUsage);
  }
  if (event.providerCost) {
    platform.metrics.recordProviderCost?.(event.providerCost);
  }
  if (platform.analyticsPersistence) {
    await platform.analyticsPersistence.recordEvent(event).catch(() => {});
  }
}

function stripProviderAnalytics(response = {}) {
  if (!response || typeof response !== "object") return response;
  const { _providerAnalytics, ...rest } = response;
  return rest;
}

module.exports = {
  analyticsFromProvider,
  recordAnalytics,
  stripProviderAnalytics,
};
