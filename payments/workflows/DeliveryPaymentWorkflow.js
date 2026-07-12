const DeliveryPricingService = require("../delivery/DeliveryPricingService");
const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Prepares delivery-related payment breakdowns for checkout/settlement.
 * Calculation only — no provider contact.
 */
class DeliveryPaymentWorkflow {
  constructor({ deliveryPricingService, ledger }) {
    this.deliveryPricingService =
      deliveryPricingService || new DeliveryPricingService();
    this.ledger = ledger;
  }

  /**
   * Pure calculation step — does not contact payment providers.
   */
  prepareDeliveryPayment(input) {
    const breakdown = this.deliveryPricingService.calculate({
      origin: input.origin,
      destination: input.destination,
      distanceKm: input.distanceKm,
      zone: input.zone,
      weightKg: input.weightKg,
      quantity: input.quantity,
      orderSubtotal: input.orderSubtotal,
      commissionRate: input.commissionRate,
    });

    return {
      ready: true,
      breakdown,
      metadata: {
        origin: input.origin,
        destination: input.destination,
        zone: input.zone,
      },
    };
  }

  /**
   * Provider settlement for delivery fees — deferred until integrations exist.
   */
  async settleDeliveryPayment({ orderId, breakdown, method, country, metadata = {} }) {
    throw new NotImplementedError("DeliveryPaymentWorkflow", "settleDeliveryPayment");
  }
}

module.exports = DeliveryPaymentWorkflow;
