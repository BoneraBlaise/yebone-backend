const createPaymentEngineBootstrap = require("../engine/PaymentEngineBootstrap");
const FeatureFlagRegistry = require("../engine/FeatureFlagRegistry");
const { createLedgerFoundation } = require("../ledger");
const { createCommissionEngine } = require("../commission");
const { createWalletFoundation } = require("../wallet");
const { createEventBus } = require("../events");
const PaymentExecutionPipeline = require("./PaymentExecutionPipeline");
const PaymentIntegrationGate = require("./PaymentIntegrationGate");
const IntegrationHealthContract = require("./IntegrationHealthContract");
const IntegrationConfigurationError = require("./errors/IntegrationConfigurationError");

/**
 * Composition root for Module 8 — wires Modules 1–7 via DI only.
 * Not registered in PaymentModule, routes, or server bootstrap.
 */
function createIntegrationFoundation(options = {}) {
  const featureFlags = options.featureFlags || new FeatureFlagRegistry(options.featureFlagOverrides);

  const bootstrap = options.bootstrap
    || createPaymentEngineBootstrap({
      featureFlags,
      ...options.bootstrapOptions,
    });

  const ledgerFoundation = options.ledgerFoundation || createLedgerFoundation(options.ledgerOptions);
  const commission = options.commission
    || createCommissionEngine({
      rules: options.commissionRules || [{ strategy: "GLOBAL", rate: 10 }],
      ...options.commissionOptions,
    });
  const wallet = options.wallet
    || createWalletFoundation({
      ledgerFoundation,
      ...options.walletOptions,
    });
  const events = options.events || createEventBus({
    autoDispatch: options.autoDispatchEvents !== true,
    ...options.eventOptions,
  });

  const deps = Object.freeze({
    engine: bootstrap.engine,
    idempotencyService: options.idempotencyService || bootstrap.idempotencyService,
    transactionService: options.transactionService || bootstrap.transactionService,
    auditService: options.auditService || bootstrap.auditService,
    commissionEngine: options.commissionEngine || commission.engine,
    ledgerFoundation,
    walletService: options.walletService || wallet.service,
    eventBus: options.eventBus || events.bus,
    featureFlags: bootstrap.featureFlags,
  });

  if (!deps.idempotencyService || !deps.transactionService || !deps.auditService) {
    throw new IntegrationConfigurationError("Integration foundation requires injectable foundation services");
  }

  const pipeline = options.pipeline || new PaymentExecutionPipeline(deps);
  const gate = options.gate || new PaymentIntegrationGate({ deps, pipeline });

  return Object.freeze({
    gate,
    pipeline,
    deps,
    bootstrap,
    ledgerFoundation,
    commission,
    wallet,
    events,
    health: () => IntegrationHealthContract.build(deps),
  });
}

module.exports = createIntegrationFoundation;
