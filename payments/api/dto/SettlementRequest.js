class SettlementRequest {
  constructor({ orderId, orderSubtotal, deliveryFee, vendorId, action, commissionInput, deliveryInput, vendorBalanceInput, idempotencyKey }) {
    this.orderId = orderId;
    this.orderSubtotal = orderSubtotal;
    this.deliveryFee = deliveryFee;
    this.vendorId = vendorId;
    this.action = action;
    this.commissionInput = commissionInput || {};
    this.deliveryInput = deliveryInput || {};
    this.vendorBalanceInput = vendorBalanceInput || {};
    this.idempotencyKey = idempotencyKey;
  }

  static from(body = {}, headers = {}) {
    return new SettlementRequest({
      orderId: body.orderId,
      orderSubtotal: body.orderSubtotal,
      deliveryFee: body.deliveryFee,
      vendorId: body.vendorId,
      action: body.action,
      commissionInput: body.commissionInput,
      deliveryInput: body.deliveryInput,
      vendorBalanceInput: body.vendorBalanceInput,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: this.action || "settle",
      orderId: this.orderId,
      orderSubtotal: this.orderSubtotal,
      deliveryFee: this.deliveryFee,
      vendorId: this.vendorId,
      commissionInput: this.commissionInput,
      deliveryInput: this.deliveryInput,
      vendorBalanceInput: this.vendorBalanceInput,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = SettlementRequest;
