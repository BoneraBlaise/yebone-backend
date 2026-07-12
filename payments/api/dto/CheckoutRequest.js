class CheckoutRequest {
  constructor({
    orderId,
    buyerId,
    vendorId,
    orderSubtotal,
    deliveryFee,
    payment,
    delivery,
    commissionInput,
    deliveryInput,
    vendorBalanceInput,
    metadata,
    idempotencyKey,
  }) {
    this.orderId = orderId;
    this.buyerId = buyerId;
    this.vendorId = vendorId;
    this.orderSubtotal = orderSubtotal;
    this.deliveryFee = deliveryFee;
    this.payment = payment || {};
    this.delivery = delivery || {};
    this.commissionInput = commissionInput || {};
    this.deliveryInput = deliveryInput || {};
    this.vendorBalanceInput = vendorBalanceInput || {};
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
  }

  static from(body = {}, headers = {}) {
    return new CheckoutRequest({
      orderId: body.orderId,
      buyerId: body.buyerId,
      vendorId: body.vendorId,
      orderSubtotal: body.orderSubtotal,
      deliveryFee: body.deliveryFee,
      payment: body.payment,
      delivery: body.delivery,
      commissionInput: body.commissionInput,
      deliveryInput: body.deliveryInput,
      vendorBalanceInput: body.vendorBalanceInput,
      metadata: body.metadata,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      orderId: this.orderId,
      buyerId: this.buyerId,
      vendorId: this.vendorId,
      orderSubtotal: this.orderSubtotal,
      deliveryFee: this.deliveryFee,
      payment: this.payment,
      delivery: this.delivery,
      commissionInput: this.commissionInput,
      deliveryInput: this.deliveryInput,
      vendorBalanceInput: this.vendorBalanceInput,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = CheckoutRequest;
