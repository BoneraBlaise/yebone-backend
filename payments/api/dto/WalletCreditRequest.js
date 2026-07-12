class WalletCreditRequest {
  constructor({ ownerId, ownerType, amount, currency, reason, metadata, idempotencyKey, currentSnapshot }) {
    this.ownerId = ownerId;
    this.ownerType = ownerType || "user";
    this.amount = amount;
    this.currency = currency;
    this.reason = reason;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
    this.currentSnapshot = currentSnapshot;
  }

  static from(body = {}, headers = {}) {
    return new WalletCreditRequest({
      ownerId: body.ownerId,
      ownerType: body.ownerType,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason,
      metadata: body.metadata,
      currentSnapshot: body.currentSnapshot,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: "credit",
      ownerId: this.ownerId,
      ownerType: this.ownerType,
      amount: this.amount,
      currency: this.currency,
      reason: this.reason,
      metadata: this.metadata,
      currentSnapshot: this.currentSnapshot,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = WalletCreditRequest;
