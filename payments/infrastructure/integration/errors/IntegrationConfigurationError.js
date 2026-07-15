class IntegrationConfigurationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "IntegrationConfigurationError";
    this.code = "INTEGRATION_CONFIGURATION_ERROR";
    this.details = details;
  }
}

module.exports = IntegrationConfigurationError;
