class RateLimitConfiguration {
  constructor(options = {}) {
    this.windowMs = options.windowMs ?? 60000;
    this.maxRequests = options.maxRequests ?? 100;
    this.keyGenerator = options.keyGenerator || "ip";
  }

  build() {
    return {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      keyGenerator: this.keyGenerator,
    };
  }
}

module.exports = RateLimitConfiguration;
