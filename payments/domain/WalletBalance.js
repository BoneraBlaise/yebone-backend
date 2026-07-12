/**
 * Wallet balance snapshot for a user or vendor.
 */
class WalletBalance {
  constructor({
    id = null,
    ownerId,
    ownerType = "user",
    availableBalance = 0,
    pendingBalance = 0,
    currency = "USD",
    lastTransactionId = null,
    metadata = {},
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.ownerId = ownerId;
    this.ownerType = ownerType;
    this.availableBalance = availableBalance;
    this.pendingBalance = pendingBalance;
    this.currency = currency;
    this.lastTransactionId = lastTransactionId;
    this.metadata = metadata;
    this.updatedAt = updatedAt;
  }

  static requiredFields() {
    return ["ownerId"];
  }
}

module.exports = WalletBalance;
