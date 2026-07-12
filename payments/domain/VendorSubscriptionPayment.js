const { PaymentStatus, PaymentMethod } = require("../enums");

/**
 * Payment record for vendor subscription billing.
 */
class VendorSubscriptionPayment {
  constructor({
    id = null,
    vendorId,
    planId,
    amount,
    currency = "USD",
    status = PaymentStatus.PENDING,
    method = PaymentMethod.CARD,
    providerCode = null,
    providerReference = null,
    billingPeriodStart = null,
    billingPeriodEnd = null,
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.vendorId = vendorId;
    this.planId = planId;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.method = method;
    this.providerCode = providerCode;
    this.providerReference = providerReference;
    this.billingPeriodStart = billingPeriodStart;
    this.billingPeriodEnd = billingPeriodEnd;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static requiredFields() {
    return ["vendorId", "planId", "amount"];
  }
}

module.exports = VendorSubscriptionPayment;
