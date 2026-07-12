class RefundRequest {
  constructor({ paymentId, orderId, amount, currency, reason, method, country, metadata, idempotencyKey, action }) {
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
    this.currency = currency;
    this.reason = reason;
    this.method = method;
    this.country = country;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
    this.action = action || "request";
  }

  static from(body = {}, headers = {}) {
    return new RefundRequest({
      paymentId: body.paymentId,
      orderId: body.orderId,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason,
      method: body.method,
      country: body.country,
      metadata: body.metadata,
      action: body.action,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: this.action,
      paymentId: this.paymentId,
      orderId: this.orderId,
      amount: this.amount,
      currency: this.currency,
      reason: this.reason,
      method: this.method,
      country: this.country,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = RefundRequest;
