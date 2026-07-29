/**
 * Estimated FASHN pricing (USD) — admin analytics only.
 * Default: tryon-v1.6 ≈ 1 credit; tryon-max ≈ 4 credits per image.
 */
const CREDIT_USD = {
  "tryon-v1.6": 0.04,
  "tryon-max": 0.16,
};

function estimateCostUsd(model = "tryon-v1.6", { creditsUsed = 1 } = {}) {
  const perCredit = CREDIT_USD[model] || CREDIT_USD["tryon-v1.6"];
  const credits = Number(creditsUsed) || 1;
  return {
    estimatedCostUsd: Number((perCredit * credits).toFixed(6)),
    creditsUsed: credits,
    model,
  };
}

module.exports = { estimateCostUsd, CREDIT_USD };
