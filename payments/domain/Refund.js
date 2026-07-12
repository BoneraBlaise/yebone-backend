const { PaymentStatus } = require("../enums");

/**
 * Refund issued against a prior payment.
 */
class Refund {
  constructor({
    id = null,
    paymentId,
    orderId = null,
    amount,
    currency = "USD",
    status = PaymentStatus.PENDING,
    reason = null,
    providerCode = null,
    providerReference = null,
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.reason = reason;
    this.providerCode = providerCode;
    this.providerReference = providerReference;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static requiredFields() {
    return ["paymentId", "amount"];
  }
}

module.exports = Refund;
