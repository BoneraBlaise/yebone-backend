const DependencyContainer = require("../di/DependencyContainer");
const ServiceRegistry = require("../di/ServiceRegistry");
const { EnvironmentBootstrap } = require("../environment");
const { ConfigurationBootstrap } = require("../configuration");
const { SecretsBootstrap } = require("../secrets");
const DatabaseBootstrap = require("../database/DatabaseBootstrap");
const { StorageBootstrap } = require("../storage");
const { EmailBootstrap } = require("../email");
const { ProductionBootstrap } = require("../deployment");
const { LivenessProbe, ReadinessProbe, HealthController } = require("../health");

class PlatformBootstrap {
  static create(options = {}) {
    const source = options.source || process.env;
    const container = new DependencyContainer();
    const serviceRegistry = new ServiceRegistry();

    const environment = EnvironmentBootstrap.create({
      source,
      profile: options.profile || source.NODE_ENV,
    });
    container.register("environment", environment);
    container.register("environmentProvider", environment.provider);

    const configuration = ConfigurationBootstrap.create({
      environmentProvider: environment.provider,
      profile: environment.profile.name,
    });
    container.register("configuration", configuration);

    const secrets = SecretsBootstrap.create(options.secrets);
    container.register("secrets", secrets);

    const databaseConfig = configuration.get("database");
    const database = DatabaseBootstrap.create({ databaseConfig });
    container.register("database", database);

    const storageConfig = configuration.get("storage");
    const storage = StorageBootstrap.create({ storageConfig });
    container.register("storage", storage);

    const emailConfig = configuration.get("email");
    const email = EmailBootstrap.create({ emailConfig });
    container.register("email", email);

    const deployment = ProductionBootstrap.create({
      container,
      environmentProvider: environment.provider,
      configuration,
      profile: environment.profile.name,
    });
    container.register("deployment", deployment);

    const livenessProbe = new LivenessProbe({ container });
    const readinessProbe = new ReadinessProbe({ container });
    const healthController = new HealthController({ livenessProbe, readinessProbe });

    container.register("livenessProbe", livenessProbe);
    container.register("readinessProbe", readinessProbe);
    container.register("healthController", healthController);

    serviceRegistry
      .register("environment", environment, { module: "environment" })
      .register("configuration", configuration, { module: "configuration" })
      .register("secrets", secrets, { module: "secrets" })
      .register("database", database, { module: "database" })
      .register("storage", storage, { module: "storage" })
      .register("email", email, { module: "email" })
      .register("deployment", deployment, { module: "deployment" })
      .register("healthController", healthController, { module: "health" });

    return {
      container,
      serviceRegistry,
      environment,
      configuration,
      secrets,
      database,
      storage,
      email,
      deployment,
      healthController,
    };
  }
}

module.exports = PlatformBootstrap;
