class BaseProfile {
  constructor(options = {}) {
    this.name = options.name || "development";
    this.strictValidation = options.strictValidation ?? false;
    this.logLevel = options.logLevel || "info";
    this.enableHealthChecks = options.enableHealthChecks ?? true;
    this.enablePlaceholderSecrets = options.enablePlaceholderSecrets ?? true;
    this.databasePoolSize = options.databasePoolSize || 2;
  }
  isStrict() { return this.strictValidation; }
}
module.exports = BaseProfile;
