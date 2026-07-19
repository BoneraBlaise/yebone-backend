const crypto = require("crypto");

class CorrelationContext {
  static create(prefix = "corr") {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  static fromInput(input = {}) {
    return input.correlationId || CorrelationContext.create();
  }
}

module.exports = CorrelationContext;
