const IntegrationDependencyError = require("./errors/IntegrationDependencyError");

/**
 * Boundary contract — integration gate must never import or wire PaymentModule.
 */
class PaymentModuleBridge {
  static FORBIDDEN_TARGETS = Object.freeze([
    "PaymentModule",
    "payments/PaymentModule",
    "payments/modules/PaymentModule",
  ]);

  static ALLOWED_FOUNDATION_MODULES = Object.freeze([
    "idempotency",
    "transactions",
    "audit",
    "engine",
    "events",
    "ledger",
    "commission",
    "wallet",
  ]);

  static getBoundary() {
    return Object.freeze({
      wired: false,
      description: "Integration gate coordinates foundation modules only",
      allowedModules: PaymentModuleBridge.ALLOWED_FOUNDATION_MODULES,
      forbiddenTargets: PaymentModuleBridge.FORBIDDEN_TARGETS,
      noProviderApi: true,
      noWebhooks: true,
      noExternalHttp: true,
    });
  }

  static assertIsolated(deps = {}) {
    if (deps.paymentModule || deps.legacyPaymentModule) {
      throw new IntegrationDependencyError("PaymentModule must not be injected into integration gate", {
        boundary: PaymentModuleBridge.getBoundary(),
      });
    }

    if (deps.providerAdapter || deps.webhookHandler) {
      throw new IntegrationDependencyError("Provider adapters and webhooks are forbidden in integration gate", {
        boundary: PaymentModuleBridge.getBoundary(),
      });
    }

    return true;
  }
}

module.exports = PaymentModuleBridge;
