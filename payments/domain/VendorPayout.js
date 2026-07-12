const { PayoutStatus, PaymentMethod } = require("../enums");

/**
 * Outbound payment from platform to vendor.
 */
class VendorPayout {
  constructor({
    id = null,
    vendorId,
    amount,
    currency = "USD",
    status = PayoutStatus.PENDING,
    method = PaymentMethod.BANK,
    providerCode = null,
    providerReference = null,
    destinationAccount = null,
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.vendorId = vendorId;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.method = method;
    this.providerCode = providerCode;
    this.providerReference = providerReference;
    this.destinationAccount = destinationAccount;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static requiredFields() {
    return ["vendorId", "amount"];
  }
}

module.exports = VendorPayout;
