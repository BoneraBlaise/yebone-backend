const PaymentEngineConfig = require("./PaymentEngineConfig");

const READY = "ready";
const MISSING = "missing";

/**
 * Builds the Payment Engine self-diagnostic health report.
 * No external API calls — internal dependency validation only.
 */
class EngineHealthContract {
  static build(engine) {
    const registry = engine.providerResolver?.registry;
    const providers = registry?.list?.() || [];
    const providersEnabled = providers.filter((entry) => entry.enabled).length;

    const idempotencyStatus = EngineHealthContract._checkService(
      engine.idempotencyService,
      "execute"
    );
    const transactionStatus = EngineHealthContract._checkService(
      engine.transactionService,
      "createTransaction"
    );
    const auditStatus = EngineHealthContract._checkService(engine.auditService, "record");
    const registryStatus = registry ? READY : MISSING;
    const resolverStatus = engine.providerResolver ? READY : MISSING;

    const foundationModules = {
      idempotency: idempotencyStatus === READY,
      transactions: transactionStatus === READY,
      audit: auditStatus === READY,
    };

    const healthy = Object.values(foundationModules).every(Boolean)
      && registryStatus === READY
      && resolverStatus === READY;

    return Object.freeze({
      healthy,
      paymentEngineEnabled: engine.featureFlags.isEnabled("paymentEngineEnabled"),
      idempotency: idempotencyStatus,
      transactionService: transactionStatus,
      auditService: auditStatus,
      providerRegistry: registryStatus,
      providerResolver: resolverStatus,
      providersRegistered: providers.length,
      providersEnabled,
      version: PaymentEngineConfig.version,
      foundationModules,
      featureFlags: engine.featureFlags.list(),
      checkedAt: new Date().toISOString(),
    });
  }

  static _checkService(service, methodName) {
    if (!service || typeof service[methodName] !== "function") {
      return MISSING;
    }
    return READY;
  }
}

module.exports = EngineHealthContract;
