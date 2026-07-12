const InfrastructureBootstrap = require("./InfrastructureBootstrap");
const InfrastructureRegistry = require("./InfrastructureRegistry");

/**
 * Infrastructure module — provider-independent deployment abstractions.
 */
class InfrastructureModule {
  constructor({ paymentModule, options = {} }) {
    const bootstrapped = InfrastructureBootstrap.create({ paymentModule, options });
    this.paymentModule = paymentModule;
    this.registry = bootstrapped.registry;
    this.environment = bootstrapped.environment;
    this.configuration = bootstrapped.configuration;
    this.secretManager = bootstrapped.secretManager;
    this.storage = bootstrapped.storage;
    this.email = bootstrapped.email;
    this.cache = bootstrapped.cache;
    this.queue = bootstrapped.queue;
    this.jobRegistry = bootstrapped.jobRegistry;
    this.scheduler = bootstrapped.scheduler;
    this.monitoring = bootstrapped.monitoring;
    this.logger = bootstrapped.logger;
    this.requestLogger = bootstrapped.requestLogger;
    this.auditLogger = bootstrapped.auditLogger;
    this.errorReporter = bootstrapped.errorReporter;
    this.exceptionCollector = bootstrapped.exceptionCollector;
    this.security = bootstrapped.security;
    this.health = bootstrapped.health;
  }

  getRegistry() {
    return this.registry;
  }

  getConfiguration() {
    return this.configuration;
  }

  getMonitoring() {
    return this.monitoring;
  }

  getLogger() {
    return this.logger;
  }

  getHealth() {
    return this.health;
  }

  getSecurityConfiguration() {
    return this.security.build();
  }

  async runHealthChecks() {
    return this.health.runAll();
  }

  async runReadinessChecks() {
    return this.health.readiness();
  }

  async runLivenessChecks() {
    return this.health.liveness();
  }
}

module.exports = InfrastructureModule;
