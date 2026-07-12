class SubscriptionRequest {
  constructor({ vendorId, planId, subscriptionPaymentId, amount, currency, method, country, metadata, idempotencyKey, action }) {
    this.vendorId = vendorId;
    this.planId = planId;
    this.subscriptionPaymentId = subscriptionPaymentId;
    this.amount = amount;
    this.currency = currency;
    this.method = method;
    this.country = country;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
    this.action = action || "create";
  }

  static from(body = {}, headers = {}) {
    return new SubscriptionRequest({
      vendorId: body.vendorId,
      planId: body.planId,
      subscriptionPaymentId: body.subscriptionPaymentId,
      amount: body.amount,
      currency: body.currency,
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
      vendorId: this.vendorId,
      planId: this.planId,
      subscriptionPaymentId: this.subscriptionPaymentId,
      amount: this.amount,
      currency: this.currency,
      method: this.method,
      country: this.country,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = SubscriptionRequest;
