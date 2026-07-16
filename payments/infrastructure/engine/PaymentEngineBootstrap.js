const { createMongoIdempotencyLayer } = require("../idempotency");
const { createTransactionFoundation } = require("../transactions");
const { createAuditFoundation } = require("../audit");
const createPaymentEngine = require("./PaymentEngineFactory");
const PaymentEngineConfig = require("./PaymentEngineConfig");

/**
 * Composition root — constructs foundation services and Payment Engine via DI.
 * Does NOT start servers, register routes, or wire PaymentModule.
 */
function createPaymentEngineBootstrap(options = {}) {
  const idempotency =
    options.idempotency ||
    createMongoIdempotencyLayer({
      scope: options.idempotencyScope || PaymentEngineConfig.idempotencyScope,
      ...options.idempotencyOptions,
    });

  const transactions = options.transactions || createTransactionFoundation(options.transactionOptions);
  const audit = options.audit || createAuditFoundation(options.auditOptions);

  const engineBundle = createPaymentEngine({
    idempotencyService: idempotency.service,
    transactionService: transactions.service,
    auditService: audit.service,
    featureFlags: options.featureFlags,
    providerRegistry: options.providerRegistry,
    providerResolver: options.providerResolver,
    registerDefaultProviders: options.registerDefaultProviders,
    config: options.config,
    providerExecutionOrchestrator: options.providerExecutionOrchestrator || null,
  });

  return Object.freeze({
    engine: engineBundle.engine,
    container: engineBundle.container,
    providerRegistry: engineBundle.providerRegistry,
    providerResolver: engineBundle.providerResolver,
    featureFlags: engineBundle.featureFlags,
    providerExecutionOrchestrator: options.providerExecutionOrchestrator || null,
    idempotencyService: idempotency.service,
    idempotencyRepository: idempotency.repository,
    idempotencyCleanup: idempotency.cleanup,
    transactionService: transactions.service,
    transactionRepository: transactions.repository,
    auditService: audit.service,
    auditRepository: audit.repository,
  });
}

module.exports = createPaymentEngineBootstrap;
