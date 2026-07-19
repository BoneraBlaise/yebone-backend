const { GrowthSettingsDefaults } = require("./GrowthSettingsDefaults");

class GrowthConfigValidation {
  static ALLOWED_KEYS = Object.keys(GrowthSettingsDefaults);

  static sanitizeSettings(input = {}) {
    const sanitized = {};
    GrowthConfigValidation.ALLOWED_KEYS.forEach((key) => {
      if (input[key] === undefined) return;
      if (typeof input[key] === "boolean") {
        sanitized[key] = { enabled: input[key] };
      } else if (typeof input[key] === "object" && input[key] !== null) {
        sanitized[key] = { enabled: Boolean(input[key].enabled) };
      }
    });
    return sanitized;
  }

  static validateSettingsUpdate(input = {}) {
    const sanitized = GrowthConfigValidation.sanitizeSettings(input);
    if (!Object.keys(sanitized).length) {
      return { valid: false, reason: "NO_VALID_SETTINGS" };
    }
    return { valid: true, settings: sanitized };
  }

  static validateCommissionRules(rules = []) {
    if (!Array.isArray(rules) || !rules.length) {
      return { valid: false, reason: "NO_VALID_RULES" };
    }
    const sanitized = rules.map((rule) => ({
      id: String(rule.id || `${rule.strategy}-${rule.rate}`),
      strategy: String(rule.strategy),
      rateType: rule.rateType === "FIXED" ? "FIXED" : "PERCENTAGE",
      rate: Number(rule.rate),
      enabled: rule.enabled !== false,
      scope: rule.scope && typeof rule.scope === "object" ? rule.scope : {},
    }));
    return { valid: true, rules: sanitized };
  }
}

module.exports = GrowthConfigValidation;
