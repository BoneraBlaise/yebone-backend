class WalletDebitRequest {
  constructor({ ownerId, ownerType, amount, currency, reason, metadata, idempotencyKey }) {
    this.ownerId = ownerId;
    this.ownerType = ownerType || "user";
    this.amount = amount;
    this.currency = currency;
    this.reason = reason;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
  }

  static from(body = {}, headers = {}) {
    return new WalletDebitRequest({
      ownerId: body.ownerId,
      ownerType: body.ownerType,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason,
      metadata: body.metadata,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: "debit",
      ownerId: this.ownerId,
      ownerType: this.ownerType,
      amount: this.amount,
      currency: this.currency,
      reason: this.reason,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = WalletDebitRequest;
