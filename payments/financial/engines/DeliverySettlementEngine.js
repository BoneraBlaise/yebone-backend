/**
 * Delivery settlement calculation engine — no external APIs.
 */
class DeliverySettlementEngine {
  constructor({ financialRules }) {
    this.financialRules = financialRules;
  }

  _round(value) {
    return Number(value.toFixed(2));
  }

  calculate({
    deliveryFee,
    driverShareRate = 0.6,
    platformShareRate = 0.25,
    vendorShareRate = 0.15,
    taxRate = 0,
  }) {
    const totalRate = driverShareRate + platformShareRate + vendorShareRate;
    const normalizedDriver = driverShareRate / totalRate;
    const normalizedPlatform = platformShareRate / totalRate;
    const normalizedVendor = vendorShareRate / totalRate;

    const driverShare = this._round(deliveryFee * normalizedDriver);
    const platformShare = this._round(deliveryFee * normalizedPlatform);
    const vendorShare = this._round(deliveryFee * normalizedVendor);

    const allocated = driverShare + platformShare + vendorShare;
    const roundingAdjustment = this._round(deliveryFee - allocated);

    const taxPlaceholder = this._round((driverShare + platformShare) * taxRate);

    return {
      deliveryFee: this._round(deliveryFee),
      driverShare,
      vendorShare,
      platformShare,
      taxPlaceholder,
      roundingAdjustment,
      totalSettled: this._round(deliveryFee + taxPlaceholder),
      shares: {
        driverShareRate: normalizedDriver,
        platformShareRate: normalizedPlatform,
        vendorShareRate: normalizedVendor,
      },
    };
  }
}

module.exports = DeliverySettlementEngine;
