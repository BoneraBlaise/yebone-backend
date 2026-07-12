class VendorPayoutRequest {
  constructor({ vendorId, payoutId, amount, currency, method, destinationAccount, metadata, idempotencyKey, action }) {
    this.vendorId = vendorId;
    this.payoutId = payoutId;
    this.amount = amount;
    this.currency = currency;
    this.method = method;
    this.destinationAccount = destinationAccount;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
    this.action = action || "request";
  }

  static from(body = {}, headers = {}) {
    return new VendorPayoutRequest({
      vendorId: body.vendorId,
      payoutId: body.payoutId,
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      destinationAccount: body.destinationAccount,
      metadata: body.metadata,
      action: body.action,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: this.action,
      vendorId: this.vendorId,
      payoutId: this.payoutId,
      amount: this.amount,
      currency: this.currency,
      method: this.method,
      destinationAccount: this.destinationAccount,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = VendorPayoutRequest;
