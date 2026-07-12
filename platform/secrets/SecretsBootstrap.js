const PlaceholderSecretProvider = require("./PlaceholderSecretProvider");
const SecretRegistry = require("./SecretRegistry");
const SecretResolver = require("./SecretResolver");
const SecretValidator = require("./SecretValidator");

class SecretsBootstrap {
  static create({ allowPlaceholders = true } = {}) {
    const provider = new PlaceholderSecretProvider({ allowPlaceholders });
    const registry = new SecretRegistry();
    const resolver = new SecretResolver({ provider, registry });
    const validator = new SecretValidator({
      requiredKeys: ["JWT_SECRET_KEY", "ACTIVATION_SECRET"],
    });
    return { provider, registry, resolver, validator };
  }
}

module.exports = SecretsBootstrap;
