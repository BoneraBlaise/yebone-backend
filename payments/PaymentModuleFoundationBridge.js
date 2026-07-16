/**
 * Optional PaymentModule bridge to PaymentEngine — backward compatible when not injected.
 */
class PaymentModuleFoundationBridge {
  constructor({ paymentEngine }) {
    if (!paymentEngine) {
      throw new Error("PaymentModuleFoundationBridge requires paymentEngine");
    }
    this.paymentEngine = paymentEngine;
  }

  isWired() {
    return Boolean(this.paymentEngine);
  }

  async charge(input = {}, trace = {}) {
    return this.paymentEngine.charge(input, trace);
  }

  async verify(input = {}, trace = {}) {
    return this.paymentEngine.verify(input, trace);
  }

  async payout(input = {}, trace = {}) {
    return this.paymentEngine.payout(input, trace);
  }

  async refund(input = {}, trace = {}) {
    return this.paymentEngine.refund(input, trace);
  }

  health() {
    return this.paymentEngine.health();
  }
}

module.exports = PaymentModuleFoundationBridge;
