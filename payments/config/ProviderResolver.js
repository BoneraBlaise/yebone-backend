/**
 * Resolves which provider implementation to use based on configuration.
 * Open for extension: add new providers by registering them in PaymentFactory.
 */
class ProviderResolver {
  constructor({ config, factory }) {
    this.config = config;
    this.factory = factory;
  }

  resolve({ method, country = null, providerCode = null }) {
    const code =
      providerCode ||
      this.config.getProviderForMethod(method, country);

    if (!code) {
      throw new Error(`No payment provider configured for method "${method}"`);
    }

    if (!this.config.isProviderEnabled(code)) {
      throw new Error(`Payment provider "${code}" is not enabled`);
    }

    return this.factory.create(code);
  }
}

module.exports = ProviderResolver;
