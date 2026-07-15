class IntegrationDependencyError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "IntegrationDependencyError";
    this.code = "INTEGRATION_DEPENDENCY_ERROR";
    this.details = details;
  }
}

module.exports = IntegrationDependencyError;
