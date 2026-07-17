/**
 * Flag-gated routing between legacy PaymentService and Payment Foundation.
 * Default routing remains legacy until per-provider charge flags are enabled.
 */
class LegacyPaymentRoutingPolicy {
  constructor(options = {}) {
    this.enabled = options.enabled === true;
    this.foundationChargeProviders = new Set(
      (options.foundationChargeProviders || []).map((code) => String(code).trim().toUpperCase())
    );
  }

  shouldUseLegacyCharge(providerCode) {
    if (!this.enabled) {
      return true;
    }

    const normalized = String(providerCode || "").trim().toUpperCase();
    if (!normalized) {
      return true;
    }

    return !this.foundationChargeProviders.has(normalized);
  }

  shouldUseFoundationWebhooks() {
    return this.enabled;
  }

  describe() {
    return Object.freeze({
      enabled: this.enabled,
      defaultChargePath: "legacy",
      foundationChargeProviders: [...this.foundationChargeProviders],
    });
  }
}

module.exports = LegacyPaymentRoutingPolicy;
