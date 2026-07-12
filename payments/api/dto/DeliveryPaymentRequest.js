class DeliveryPaymentRequest {
  constructor({ orderId, orderSubtotal, deliveryFee, vendorId, origin, destination, distanceKm, zone, weightKg, quantity, breakdown, action, metadata, idempotencyKey }) {
    this.orderId = orderId;
    this.orderSubtotal = orderSubtotal;
    this.deliveryFee = deliveryFee;
    this.vendorId = vendorId;
    this.origin = origin;
    this.destination = destination;
    this.distanceKm = distanceKm;
    this.zone = zone;
    this.weightKg = weightKg;
    this.quantity = quantity;
    this.breakdown = breakdown;
    this.action = action;
    this.metadata = metadata || {};
    this.idempotencyKey = idempotencyKey;
  }

  static from(body = {}, headers = {}) {
    return new DeliveryPaymentRequest({
      orderId: body.orderId,
      orderSubtotal: body.orderSubtotal,
      deliveryFee: body.deliveryFee,
      vendorId: body.vendorId,
      origin: body.origin,
      destination: body.destination,
      distanceKm: body.distanceKm,
      zone: body.zone,
      weightKg: body.weightKg,
      quantity: body.quantity,
      breakdown: body.breakdown,
      action: body.action,
      metadata: body.metadata,
      idempotencyKey: headers["idempotency-key"] || body.idempotencyKey,
    });
  }

  toPayload() {
    return {
      action: this.action || "prepare",
      orderId: this.orderId,
      orderSubtotal: this.orderSubtotal,
      deliveryFee: this.deliveryFee,
      vendorId: this.vendorId,
      origin: this.origin,
      destination: this.destination,
      distanceKm: this.distanceKm,
      zone: this.zone,
      weightKg: this.weightKg,
      quantity: this.quantity,
      breakdown: this.breakdown,
      metadata: this.metadata,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = DeliveryPaymentRequest;
