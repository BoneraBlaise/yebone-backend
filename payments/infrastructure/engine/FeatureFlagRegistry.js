const PaymentEngineDisabledError = require("./errors/PaymentEngineDisabledError");

const DEFAULT_FLAGS = Object.freeze({
  paymentEngineEnabled: false,
  mtnEnabled: false,
  airtelEnabled: false,
  flutterwaveEnabled: false,
  paypackEnabled: false,
  stripeEnabled: false,
});

const PROVIDER_FLAG_MAP = Object.freeze({
  MTN_MOMO: "mtnEnabled",
  AIRTEL_MONEY: "airtelEnabled",
  PAYPACK: "paypackEnabled",
  FLUTTERWAVE: "flutterwaveEnabled",
  STRIPE: "stripeEnabled",
});

/**
 * In-memory feature flag registry — defaults OFF for safe rollout.
 */
class FeatureFlagRegistry {
  constructor(initial = {}) {
    this.flags = { ...DEFAULT_FLAGS, ...initial };
  }

  isEnabled(flagName) {
    return Boolean(this.flags[flagName]);
  }

  enable(flagName) {
    if (!(flagName in DEFAULT_FLAGS)) {
      throw new Error(`Unknown feature flag: ${flagName}`);
    }
    this.flags[flagName] = true;
  }

  disable(flagName) {
    if (!(flagName in DEFAULT_FLAGS)) {
      throw new Error(`Unknown feature flag: ${flagName}`);
    }
    this.flags[flagName] = false;
  }

  list() {
    return { ...this.flags };
  }

  assertEngineEnabled() {
    if (!this.isEnabled("paymentEngineEnabled")) {
      throw new PaymentEngineDisabledError();
    }
  }

  isProviderEnabled(providerCode) {
    const flag = PROVIDER_FLAG_MAP[providerCode];
    if (!flag) {
      return false;
    }
    return this.isEnabled(flag);
  }

  static getProviderFlagName(providerCode) {
    return PROVIDER_FLAG_MAP[providerCode] || null;
  }
}

module.exports = FeatureFlagRegistry;
