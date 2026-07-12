const { PaymentStatus, PaymentMethod, ProviderCode } = require("../enums");

/**
 * Payment record for a marketplace order.
 * Persists independently of any specific provider implementation.
 */
class OrderPayment {
  constructor({
    id = null,
    orderId,
    userId,
    amount,
    currency = "USD",
    status = PaymentStatus.PENDING,
    method = PaymentMethod.CARD,
    providerCode = null,
    providerReference = null,
    paymentIntentId = null,
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.orderId = orderId;
    this.userId = userId;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.method = method;
    this.providerCode = providerCode;
    this.providerReference = providerReference;
    this.paymentIntentId = paymentIntentId;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static requiredFields() {
    return ["orderId", "userId", "amount"];
  }
}

module.exports = OrderPayment;
