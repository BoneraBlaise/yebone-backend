class DeploymentValidator {
  constructor({ environmentProvider, configuration } = {}) {
    this.environmentProvider = environmentProvider;
    this.configuration = configuration;
  }

  validate(profile = "production") {
    const errors = [];
    const warnings = [];

    const nodeEnv = this.environmentProvider?.get("NODE_ENV", "development");
    if (profile === "production" && nodeEnv !== "production") {
      warnings.push({ code: "NODE_ENV_MISMATCH", message: `NODE_ENV is ${nodeEnv}, expected production` });
    }

    const port = this.environmentProvider?.get("PORT");
    if (!port) {
      errors.push({ code: "MISSING_PORT", message: "PORT is required for deployment" });
    }

    const dbUrl = this.environmentProvider?.get("DB_URL");
    if (!dbUrl && (profile === "production" || profile === "staging")) {
      errors.push({ code: "MISSING_DB_URL", message: "DB_URL is required for deployment" });
    }

    const logging = this.configuration?.get("logging");
    if (logging?.level === "debug" && profile === "production") {
      warnings.push({ code: "DEBUG_LOGGING", message: "Debug logging enabled in production" });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      profile,
      validatedAt: new Date().toISOString(),
    };
  }
}

module.exports = DeploymentValidator;
