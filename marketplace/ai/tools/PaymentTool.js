const BaseTool = require("./BaseTool");

const MUTATION_ACTIONS = new Set(["charge", "create", "pay", "initiate", "capture"]);

/**
 * PaymentTool — readiness and health via PaymentIntegrationHook only.
 */
class PaymentTool extends BaseTool {
  constructor({ marketplaceCore } = {}) {
    super({
      id: "payment.readiness",
      name: "PaymentTool",
      version: "7.2.0",
      capabilities: ["readiness", "supported_providers", "payment_availability", "health"],
      permissions: ["public"],
      platform: "PaymentIntegrationHook",
    });
    this.marketplaceCore = marketplaceCore;
  }

  get paymentHook() {
    return this.marketplaceCore?.hooks?.payment || null;
  }

  health() {
    const hook = this.paymentHook;
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(hook),
      hookEnabled: Boolean(hook?.enabled),
    });
  }

  async execute(input = {}, _context = {}) {
    const hook = this.paymentHook;
    if (!hook) {
      throw new Error("PaymentTool requires PaymentIntegrationHook");
    }

    const action = String(input.action || "readiness").toLowerCase();
    if (MUTATION_ACTIONS.has(action)) {
      const error = new Error("Payment initiation is not supported in Phase 7.2");
      error.statusCode = 403;
      error.code = "mutation_not_supported";
      throw error;
    }

    const enabled = Boolean(hook.enabled);
    const configEnabled = Boolean(this.marketplaceCore?.config?.enablePaymentHooks);

    return {
      readiness: enabled && configEnabled ? "ready" : "disabled",
      enabled,
      paymentHooksEnabled: configEnabled,
      supportedProviders: ["CARD", "MOMO"],
      paymentAvailability: enabled ? "available" : "unavailable",
      health: {
        healthy: enabled,
        hook: "PaymentIntegrationHook",
        checkedAt: new Date().toISOString(),
      },
      note: "Read-only readiness probe — no payment state mutation",
    };
  }
}

module.exports = PaymentTool;
