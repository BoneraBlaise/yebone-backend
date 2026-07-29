/**
 * Estimated OpenAI pricing (USD per token) — used for admin analytics only.
 * Update when OpenAI pricing changes; never shown to customers/vendors.
 */
const MODEL_PRICING_USD = Object.freeze({
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  "gpt-4-turbo": { input: 10 / 1_000_000, output: 30 / 1_000_000 },
});

const DEFAULT_PRICING = MODEL_PRICING_USD["gpt-4o-mini"];

function estimateCostUsd(model, usage = {}) {
  const pricing = MODEL_PRICING_USD[model] || DEFAULT_PRICING;
  const inputTokens = Number(usage.inputTokens || usage.prompt_tokens || 0);
  const outputTokens = Number(usage.outputTokens || usage.completion_tokens || 0);
  const totalTokens = inputTokens + outputTokens;
  const cost =
    inputTokens * pricing.input + outputTokens * pricing.output;
  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: Math.round(cost * 1_000_000) / 1_000_000,
  };
}

module.exports = { MODEL_PRICING_USD, estimateCostUsd };
