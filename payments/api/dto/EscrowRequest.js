class EscrowRequest {
  constructor({ orderId, escrowId, amount, totalAmount, currency, buyerId, vendorId, reason, currentState, metadata, idempotencyKey, action, settlement }) {
    this.orderId = orderId;
    this.escrowId = escrowId;
    this.amount = amount;
    this.totalAmount = totalAmount;
    this.currency = currency;
    this.buyerId = buyerId;
    this.vendorId = vendorId;
    this.reason = reason;
    this.currentState = currentState;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
    this.action = action || "hold";
    this.settlement = settlement;
  }

  static from(body = {}, headers = {}) {
    return new EscrowRequest({
      orderId: body.orderId,
      escrowId: body.escrowId,
      amount: body.amount,
      totalAmount: body.totalAmount,
      currency: body.currency,
      buyerId: body.buyerId,
      vendorId: body.vendorId,
      reason: body.reason,
      currentState: body.currentState,
      metadata: body.metadata,
      settlement: body.settlement,
      action: body.action,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: this.action,
      orderId: this.orderId,
      escrowId: this.escrowId,
      amount: this.amount,
      totalAmount: this.totalAmount,
      currency: this.currency,
      buyerId: this.buyerId,
      vendorId: this.vendorId,
      reason: this.reason,
      currentState: this.currentState,
      metadata: this.metadata,
      settlement: this.settlement,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = EscrowRequest;
