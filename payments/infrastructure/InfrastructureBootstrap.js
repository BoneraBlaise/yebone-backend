const { ConfigurationManager } = require("./configuration");
const { MemoryEnvironmentProvider } = require("./environment");
const { MemorySecretProvider, SecretManager } = require("./secrets");
const { MemoryStorageProvider } = require("./storage");
const { MemoryEmailProvider } = require("./email");
const { MemoryCacheProvider } = require("./cache");
const { MemoryQueueProvider } = require("./queue");
const { JobRegistry, SchedulerRegistry } = require("./scheduler");
const { MetricsCollector, MonitoringService } = require("./monitoring");
const { StructuredLogger, RequestLogger, AuditLogger } = require("./logging");
const { MemoryErrorReporter, ExceptionCollector } = require("./errors");
const {
  SecurityConfiguration,
  HelmetConfiguration,
  CorsConfiguration,
  CompressionConfiguration,
  RateLimitConfiguration,
  SecurityHeadersConfiguration,
} = require("./security");
const { createDefaultHealthChecks } = require("./health");
const InfrastructureRegistry = require("./InfrastructureRegistry");

/**
 * Bootstraps all infrastructure abstractions with in-memory providers.
 */
class InfrastructureBootstrap {
  static create({ paymentModule, options = {} } = {}) {
    const environment = options.environment || new MemoryEnvironmentProvider();
    const configuration = options.configuration || new ConfigurationManager();
    const secrets = options.secrets || new MemorySecretProvider();
    const secretManager = new SecretManager({ provider: secrets });
    const storage = options.storage || new MemoryStorageProvider();
    const email = options.email || new MemoryEmailProvider();
    const cache = options.cache || new MemoryCacheProvider();
    const queue = options.queue || new MemoryQueueProvider();
    const jobRegistry = options.jobRegistry || new JobRegistry();
    const scheduler = new SchedulerRegistry({ jobRegistry });
    const metricsCollector = options.metricsCollector || new MetricsCollector();
    const monitoring = new MonitoringService({ collector: metricsCollector });
    const logger = options.logger || new StructuredLogger({ serviceName: "yebone-payments" });
    const requestLogger = new RequestLogger({ logger, monitoring });
    const auditLogger = new AuditLogger({ logger });
    const errorReporter = options.errorReporter || new MemoryErrorReporter();
    const exceptionCollector = new ExceptionCollector({ errorReporter });
    const security = new SecurityConfiguration({
      helmet: new HelmetConfiguration(options.security?.helmet),
      cors: new CorsConfiguration(options.security?.cors),
      compression: new CompressionConfiguration(options.security?.compression),
      rateLimit: new RateLimitConfiguration(options.security?.rateLimit),
      securityHeaders: new SecurityHeadersConfiguration(options.security?.securityHeaders),
    });
    const health = createDefaultHealthChecks({ paymentModule, monitoring });

    const registry = new InfrastructureRegistry();
    registry
      .register("environment", environment)
      .register("configuration", configuration)
      .register("secrets", secretManager)
      .register("storage", storage)
      .register("email", email)
      .register("cache", cache)
      .register("queue", queue)
      .register("jobRegistry", jobRegistry)
      .register("scheduler", scheduler)
      .register("monitoring", monitoring)
      .register("logger", logger)
      .register("requestLogger", requestLogger)
      .register("auditLogger", auditLogger)
      .register("errorReporter", errorReporter)
      .register("exceptionCollector", exceptionCollector)
      .register("security", security)
      .register("health", health);

    return {
      registry,
      environment,
      configuration,
      secretManager,
      storage,
      email,
      cache,
      queue,
      jobRegistry,
      scheduler,
      monitoring,
      logger,
      requestLogger,
      auditLogger,
      errorReporter,
      exceptionCollector,
      security,
      health,
    };
  }
}

module.exports = InfrastructureBootstrap;
