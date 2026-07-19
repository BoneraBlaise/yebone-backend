const DeliverySettingsDefaults = require("./DeliverySettingsDefaults");

class DeliveryConfigValidation {
  static ALLOWED_KEYS = Object.keys(DeliverySettingsDefaults);

  static sanitizeUpdate(input = {}) {
    const sanitized = {};
    DeliveryConfigValidation.ALLOWED_KEYS.forEach((key) => {
      if (input[key] === undefined) return;
      if (typeof input[key] === "boolean") {
        sanitized[key] = { enabled: input[key] };
      } else if (typeof input[key] === "object" && input[key] !== null) {
        sanitized[key] = { enabled: Boolean(input[key].enabled) };
      }
    });
    return sanitized;
  }

  static validateUpdate(input = {}) {
    const sanitized = DeliveryConfigValidation.sanitizeUpdate(input);
    if (!Object.keys(sanitized).length) {
      return { valid: false, reason: "NO_VALID_SETTINGS" };
    }
    return { valid: true, settings: sanitized };
  }
}

module.exports = DeliveryConfigValidation;
