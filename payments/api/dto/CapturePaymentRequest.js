class CapturePaymentRequest {
  constructor({ orderId, paymentId, amount, currency, method, country, providerCode, metadata, idempotencyKey, settlement }) {
    this.orderId = orderId;
    this.paymentId = paymentId;
    this.amount = amount;
    this.currency = currency;
    this.method = method;
    this.country = country;
    this.providerCode = providerCode;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
    this.settlement = settlement;
  }

  static from(body = {}, headers = {}) {
    return new CapturePaymentRequest({
      orderId: body.orderId,
      paymentId: body.paymentId,
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      country: body.country,
      providerCode: body.providerCode,
      metadata: body.metadata,
      settlement: body.settlement,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: "capture",
      orderId: this.orderId,
      paymentId: this.paymentId,
      amount: this.amount,
      currency: this.currency,
      method: this.method,
      country: this.country,
      providerCode: this.providerCode,
      metadata: this.metadata,
      settlement: this.settlement,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = CapturePaymentRequest;
