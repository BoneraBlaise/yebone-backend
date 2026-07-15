class PaymentEngineDisabledError extends Error {
  constructor(message = "Payment Engine is disabled — enable paymentEngineEnabled to proceed") {
    super(message);
    this.name = "PaymentEngineDisabledError";
    this.code = "PAYMENT_ENGINE_DISABLED";
  }
}

module.exports = PaymentEngineDisabledError;
