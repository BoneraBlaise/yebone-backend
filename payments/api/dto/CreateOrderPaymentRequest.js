class CreateOrderPaymentRequest {
  constructor({ orderId, userId, amount, currency, method, country, metadata, idempotencyKey }) {
    this.orderId = orderId;
    this.userId = userId;
    this.amount = amount;
    this.currency = currency;
    this.method = method;
    this.country = country;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
  }

  static from(body = {}, headers = {}) {
    return new CreateOrderPaymentRequest({
      orderId: body.orderId,
      userId: body.userId,
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      country: body.country,
      metadata: body.metadata,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: "create",
      orderId: this.orderId,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
      method: this.method,
      country: this.country,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = CreateOrderPaymentRequest;
