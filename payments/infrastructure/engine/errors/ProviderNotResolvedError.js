class ProviderNotResolvedError extends Error {
  constructor(criteria = {}) {
    super("No provider matched the given criteria");
    this.name = "ProviderNotResolvedError";
    this.code = "PROVIDER_NOT_RESOLVED";
    this.criteria = criteria;
  }
}

module.exports = ProviderNotResolvedError;
