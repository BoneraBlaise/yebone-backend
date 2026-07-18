const crypto = require("crypto");

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) instructions/i,
  /system prompt/i,
  /you are now/i,
  /disregard (your|the) (rules|instructions)/i,
];

class AIRequestSecurity {
  constructor(config = {}, hooks = null) {
    this.config = config;
    this.hooks = hooks;
  }

  detectInjection(text = "") {
    if (!this.config.enableInjectionGuards) {
      return { detected: false, patterns: [] };
    }
    const matched = INJECTION_PATTERNS.filter((pattern) => pattern.test(text)).map(String);
    return { detected: matched.length > 0, patterns: matched };
  }

  async assertSafeMessage(message = "") {
    const check = this.detectInjection(message);
    if (check.detected && this.hooks) {
      await this.hooks.emit("onInjectionDetected", { patterns: check.patterns });
    }
    return check;
  }

  createRequestId() {
    return crypto.randomUUID();
  }
}

module.exports = AIRequestSecurity;
