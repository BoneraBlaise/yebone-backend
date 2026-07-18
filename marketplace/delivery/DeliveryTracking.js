const crypto = require("crypto");

/**
 * Tracking number generation and validation.
 */
class DeliveryTracking {
  constructor({ prefix = "YEB-DLV" } = {}) {
    this.prefix = prefix;
  }

  generate() {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${this.prefix}-${stamp}-${random}`;
  }

  isValidFormat(trackingNumber) {
    if (typeof trackingNumber !== "string") return false;
    const trimmed = trackingNumber.trim();
    if (!trimmed.startsWith(`${this.prefix}-`)) return false;
    return trimmed.length >= this.prefix.length + 10;
  }

  normalize(trackingNumber) {
    if (typeof trackingNumber !== "string") return null;
    const trimmed = trackingNumber.trim().toUpperCase();
    return trimmed.length ? trimmed : null;
  }
}

module.exports = DeliveryTracking;
