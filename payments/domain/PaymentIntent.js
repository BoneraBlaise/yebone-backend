const { PaymentStatus, PaymentMethod } = require("../enums");

/**
 * Provider-agnostic payment intent before capture/settlement.
 */
class PaymentIntent {
  constructor({
    id = null,
    amount,
    currency = "USD",
    status = PaymentStatus.PENDING,
    method = PaymentMethod.CARD,
    providerCode = null,
    providerIntentId = null,
    clientSecret = null,
    customerId = null,
    metadata = {},
    expiresAt = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.method = method;
    this.providerCode = providerCode;
    this.providerIntentId = providerIntentId;
    this.clientSecret = clientSecret;
    this.customerId = customerId;
    this.metadata = metadata;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static requiredFields() {
    return ["amount"];
  }
}

module.exports = PaymentIntent;
