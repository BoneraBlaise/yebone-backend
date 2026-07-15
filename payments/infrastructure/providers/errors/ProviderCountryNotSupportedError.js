class ProviderCountryNotSupportedError extends Error {
  constructor(providerCode, country) {
    super(`Provider ${providerCode} does not support country ${country}`);
    this.name = "ProviderCountryNotSupportedError";
    this.code = "PROVIDER_COUNTRY_NOT_SUPPORTED";
    this.providerCode = providerCode;
    this.country = country;
  }
}

module.exports = ProviderCountryNotSupportedError;
