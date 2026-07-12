class SecurityHeadersConfiguration {
  constructor(options = {}) {
    this.frameguard = options.frameguard ?? "deny";
    this.noSniff = options.noSniff ?? true;
    this.xssFilter = options.xssFilter ?? true;
    this.referrerPolicy = options.referrerPolicy ?? "no-referrer";
  }

  build() {
    return {
      frameguard: this.frameguard,
      noSniff: this.noSniff,
      xssFilter: this.xssFilter,
      referrerPolicy: this.referrerPolicy,
    };
  }
}

module.exports = SecurityHeadersConfiguration;
