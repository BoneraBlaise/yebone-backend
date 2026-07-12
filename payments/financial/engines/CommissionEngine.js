/**
 * Platform commission calculation engine.
 */
class CommissionEngine {
  constructor({ financialRules }) {
    this.financialRules = financialRules;
  }

  _round(value) {
    return Number(value.toFixed(2));
  }

  calculate({
    orderSubtotal,
    categoryRate = null,
    vendorRate = null,
    subscriptionDiscount = 0,
    promotionalOverride = null,
    minimumCommission = null,
    maximumCommission = null,
    fixedFee = null,
    percentageFee = null,
  }) {
    let effectiveRate = percentageFee ?? vendorRate ?? categoryRate ?? this.financialRules.defaultCommissionRate;

    if (subscriptionDiscount > 0) {
      effectiveRate *= this.financialRules.subscriptionPriorityMultiplier;
    }

    if (promotionalOverride !== null && promotionalOverride !== undefined) {
      effectiveRate = promotionalOverride;
    }

    this.financialRules.validateCommissionRate(effectiveRate);

    const percentageAmount = orderSubtotal * effectiveRate;
    const appliedFixedFee = fixedFee ?? this.financialRules.defaultFixedFee;
    let commissionTotal = percentageAmount + appliedFixedFee;

    const minCommission = minimumCommission ?? orderSubtotal * this.financialRules.minimumCommissionRate;
    const maxCommission = maximumCommission ?? orderSubtotal * this.financialRules.maximumCommissionRate;

    commissionTotal = Math.max(minCommission, Math.min(maxCommission, commissionTotal));

    const vendorAmount = this._round(orderSubtotal - commissionTotal);
    const platformAmount = this._round(commissionTotal);

    return {
      orderSubtotal: this._round(orderSubtotal),
      effectiveRate: this._round(effectiveRate),
      percentageAmount: this._round(percentageAmount),
      fixedFee: this._round(appliedFixedFee),
      minimumCommission: this._round(minCommission),
      maximumCommission: this._round(maxCommission),
      commissionTotal: platformAmount,
      vendorAmount: Math.max(0, vendorAmount),
      platformAmount,
      breakdown: {
        categoryRate,
        vendorRate,
        subscriptionDiscount,
        promotionalOverride,
      },
    };
  }
}

module.exports = CommissionEngine;
