const PaymentEngine = require("./PaymentEngine");
const ProviderRegistry = require("./ProviderRegistry");
const ProviderResolver = require("./ProviderResolver");
const FeatureFlagRegistry = require("./FeatureFlagRegistry");
const EngineDependencyContainer = require("./EngineDependencyContainer");
const PaymentEngineConfig = require("./PaymentEngineConfig");

/**
 * Factory for constructing a PaymentEngine with injected dependencies.
 */
function createPaymentEngine(options = {}) {
  const featureFlags = options.featureFlags || new FeatureFlagRegistry();
  const providerRegistry = options.providerRegistry || new ProviderRegistry();
  if (options.registerDefaultProviders !== false && providerRegistry.list().length === 0) {
    providerRegistry.registerDefaults();
  }

  const providerResolver =
    options.providerResolver ||
    new ProviderResolver({ registry: providerRegistry, featureFlags });

  const engine = new PaymentEngine({
    idempotencyService: options.idempotencyService,
    transactionService: options.transactionService,
    auditService: options.auditService,
    providerResolver,
    featureFlags,
    config: options.config || PaymentEngineConfig,
    providerExecutionOrchestrator: options.providerExecutionOrchestrator || null,
  });

  const container =
    options.container ||
    new EngineDependencyContainer({
      idempotencyService: options.idempotencyService,
      transactionService: options.transactionService,
      auditService: options.auditService,
      providerRegistry,
      providerResolver,
      featureFlags,
      engine,
    });

  return {
    engine,
    container,
    providerRegistry,
    providerResolver,
    featureFlags,
  };
}

module.exports = createPaymentEngine;
