/**
 * @deprecated Use Growth Platform + Payments Commission Engine instead.
 * Kept for backward compatibility with legacy imports.
 */
const calculateCommissionRate = (price) => {
  try {
    const { getGrowthPlatform } = require("../marketplace/growth");
    const store = getGrowthPlatform().getConfigurationPlatform().getStore();
    const rules = store.getCommissionRules();
    const baseRule = rules.find((rule) => rule.scope === "GLOBAL" && rule.type === "BASE");
    if (baseRule?.rate) return Number(baseRule.rate);
  } catch (_error) {
    // Growth Platform may not be initialized in isolated unit tests.
  }

  const productPrice = Number(price);
  if (productPrice >= 500000) return 2;
  if (productPrice >= 280000 && productPrice <= 300000) return 4;
  if (productPrice >= 190000 && productPrice < 200000) return 6;
  if (productPrice < 50000) return 10;
  return 0;
};

module.exports = calculateCommissionRate;
