/**
 * Security configuration builder — no middleware registration.
 */
class SecurityConfiguration {
  constructor(options = {}) {
    this.helmet = options.helmet || null;
    this.cors = options.cors || null;
    this.compression = options.compression || null;
    this.rateLimit = options.rateLimit || null;
    this.securityHeaders = options.securityHeaders || null;
  }

  build() {
    return {
      helmet: this.helmet?.build?.() || null,
      cors: this.cors?.build?.() || null,
      compression: this.compression?.build?.() || null,
      rateLimit: this.rateLimit?.build?.() || null,
      securityHeaders: this.securityHeaders?.build?.() || null,
    };
  }
}

module.exports = SecurityConfiguration;
