const { ProviderCode } = require("../enums");
const {
  StripeProvider,
  FlutterwaveProvider,
  PaypackProvider,
  MTNMoMoProvider,
  AirtelMoneyProvider,
} = require("../providers");

/**
 * Factory for payment provider instances.
 * Register new providers here without changing PaymentService.
 */
class PaymentFactory {
  constructor(registry = null) {
    this.registry =
      registry ||
      new Map([
        [ProviderCode.STRIPE, StripeProvider],
        [ProviderCode.FLUTTERWAVE, FlutterwaveProvider],
        [ProviderCode.PAYPACK, PaypackProvider],
        [ProviderCode.MTN_MOMO, MTNMoMoProvider],
        [ProviderCode.AIRTEL_MONEY, AirtelMoneyProvider],
      ]);
  }

  register(code, ProviderClass) {
    this.registry.set(code, ProviderClass);
  }

  create(code) {
    const ProviderClass = this.registry.get(code);
    if (!ProviderClass) {
      throw new Error(`No provider registered for code "${code}"`);
    }
    return new ProviderClass();
  }

  listRegisteredCodes() {
    return Array.from(this.registry.keys());
  }
}

module.exports = PaymentFactory;
