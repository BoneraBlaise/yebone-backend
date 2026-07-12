const ApplicationConfig = require("./ApplicationConfig");
const DatabaseConfig = require("./DatabaseConfig");
const StorageConfig = require("./StorageConfig");
const EmailConfig = require("./EmailConfig");
const PaymentConfigPlaceholder = require("./PaymentConfigPlaceholder");
const SecurityConfig = require("./SecurityConfig");
const LoggingConfig = require("./LoggingConfig");
const ConfigurationRegistry = require("./ConfigurationRegistry");

class ConfigurationBootstrap {
  static create({ environmentProvider, profile }) {
    const registry = new ConfigurationRegistry();
    registry
      .register("application", new ApplicationConfig(environmentProvider))
      .register("database", new DatabaseConfig(environmentProvider))
      .register("storage", new StorageConfig(environmentProvider))
      .register("email", new EmailConfig(environmentProvider))
      .register("payment", new PaymentConfigPlaceholder(environmentProvider))
      .register("security", new SecurityConfig(environmentProvider))
      .register("logging", new LoggingConfig(environmentProvider, profile));
    return registry;
  }
}
module.exports = ConfigurationBootstrap;
