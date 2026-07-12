/**
 * Pure delivery pricing calculation engine.
 * No external APIs, maps, or provider dependencies.
 */
class DeliveryPricingService {
  constructor(options = {}) {
    this.baseFee = options.baseFee ?? 2.5;
    this.perKmRate = options.perKmRate ?? 0.75;
    this.perKgRate = options.perKgRate ?? 0.5;
    this.commissionRate = options.commissionRate ?? 0.1;
    this.zoneMultipliers = options.zoneMultipliers ?? {
      LOCAL: 1,
      REGIONAL: 1.25,
      NATIONAL: 1.5,
      INTERNATIONAL: 2,
    };
  }

  resolveZoneMultiplier(zone) {
    if (!zone) return 1;
    return this.zoneMultipliers[zone] ?? 1;
  }

  calculateDeliveryFee({ distanceKm = 0, weightKg = 0, quantity = 1, zone = "LOCAL" }) {
    const zoneMultiplier = this.resolveZoneMultiplier(zone);
    const distanceComponent = Math.max(0, distanceKm) * this.perKmRate;
    const weightComponent = Math.max(0, weightKg) * this.perKgRate;
    const quantityComponent = Math.max(1, quantity) * 0.25;
    const rawFee = (this.baseFee + distanceComponent + weightComponent + quantityComponent) * zoneMultiplier;
    return Number(rawFee.toFixed(2));
  }

  calculateCommission(orderSubtotal, commissionRate = this.commissionRate) {
    const rate = Math.max(0, Math.min(1, commissionRate));
    return Number((orderSubtotal * rate).toFixed(2));
  }

  /**
   * Full delivery payment breakdown for marketplace settlement.
   */
  calculate({
    origin,
    destination,
    distanceKm,
    zone,
    weightKg,
    quantity,
    orderSubtotal,
    commissionRate = this.commissionRate,
  }) {
    const deliveryFee = this.calculateDeliveryFee({
      distanceKm,
      weightKg,
      quantity,
      zone,
    });
    const grossTotal = Number((orderSubtotal + deliveryFee).toFixed(2));
    const marketplaceCommission = this.calculateCommission(orderSubtotal, commissionRate);
    const platformAmount = Number((marketplaceCommission + deliveryFee * 0.15).toFixed(2));
    const vendorAmount = Number((grossTotal - platformAmount).toFixed(2));

    return {
      origin,
      destination,
      distanceKm,
      zone,
      weightKg,
      quantity,
      orderSubtotal,
      deliveryFee,
      marketplaceCommission,
      grossTotal,
      vendorAmount: Math.max(0, vendorAmount),
      platformAmount: Math.max(0, platformAmount),
      commissionRate,
    };
  }
}

module.exports = DeliveryPricingService;
