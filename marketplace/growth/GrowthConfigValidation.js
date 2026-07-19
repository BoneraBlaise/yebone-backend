const { randomUUID } = require("crypto");
const { GrowthSettingsDefaults, STRATEGY_LABELS } = require("./GrowthSettingsDefaults");
const CommissionConfig = require("../../payments/infrastructure/commission/CommissionConfig");

const ALLOWED_STRATEGIES = Object.keys(STRATEGY_LABELS);

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

  static normalizeCommissionRule(rule = {}, { admin = "system", reason = null } = {}) {
    const strategy = String(rule.strategy || "").toUpperCase();
    if (!CommissionConfig.strategies.includes(strategy)) {
      throw GrowthConfigValidation._validationError(`Invalid strategy: ${strategy}`);
    }

    const now = new Date().toISOString();
    return {
      id: String(rule.id || randomUUID()),
      name: String(rule.name || `${STRATEGY_LABELS[strategy] || strategy} Rule`),
      description: rule.description ? String(rule.description) : "",
      strategy,
      rateType: rule.rateType === "FIXED" ? "FIXED" : "PERCENTAGE",
      rate: Number(rule.rate),
      priority:
        rule.priority != null
          ? Number(rule.priority)
          : CommissionConfig.resolutionPriority[strategy] ?? 99,
      enabled: rule.enabled !== false && rule.archived !== true,
      archived: Boolean(rule.archived),
      scope: rule.scope && typeof rule.scope === "object" ? { ...rule.scope } : {},
      startDate: rule.startDate || null,
      endDate: rule.endDate || null,
      createdBy: rule.createdBy || admin,
      updatedBy: admin,
      reason: reason || rule.reason || null,
      createdAt: rule.createdAt || now,
      updatedAt: now,
    };
  }

  static validateCommissionRule(rule = {}, options = {}) {
    try {
      const normalized = GrowthConfigValidation.normalizeCommissionRule(rule, options);
      if (!Number.isFinite(normalized.rate) || normalized.rate < 0) {
        throw GrowthConfigValidation._validationError("Rate must be a non-negative number");
      }
      if (normalized.rateType === "PERCENTAGE" && normalized.rate > 100) {
        throw GrowthConfigValidation._validationError("Percentage rate cannot exceed 100");
      }
      return { valid: true, rule: normalized };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  static validateCommissionRules(rules = [], options = {}) {
    if (!Array.isArray(rules) || !rules.length) {
      return { valid: false, reason: "NO_VALID_RULES" };
    }
    const sanitized = rules.map((rule) => {
      const result = GrowthConfigValidation.validateCommissionRule(rule, options);
      if (!result.valid) {
        throw GrowthConfigValidation._validationError(result.reason);
      }
      return result.rule;
    });
    return { valid: true, rules: sanitized };
  }

  static validateCommissionRuleInput(input = {}, options = {}) {
    return GrowthConfigValidation.validateCommissionRule(input, options);
  }

  static _validationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }
}

module.exports = GrowthConfigValidation;
