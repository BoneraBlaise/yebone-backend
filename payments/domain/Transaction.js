const { TransactionType, PaymentStatus } = require("../enums");

/**
 * Immutable ledger entry for any money movement.
 */
class Transaction {
  constructor({
    id = null,
    type,
    referenceId,
    amount,
    currency = "USD",
    status = PaymentStatus.PENDING,
    providerCode = null,
    providerReference = null,
    description = null,
    metadata = {},
    createdAt = new Date(),
  }) {
    this.id = id;
    this.type = type;
    this.referenceId = referenceId;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.providerCode = providerCode;
    this.providerReference = providerReference;
    this.description = description;
    this.metadata = metadata;
    this.createdAt = createdAt;
  }

  static requiredFields() {
    return ["type", "referenceId", "amount"];
  }
}

module.exports = Transaction;
