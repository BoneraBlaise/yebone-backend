class GrowthOperationGuard {
  constructor({ featureFlags, analytics } = {}) {
    this.featureFlags = featureFlags;
    this.analytics = analytics;
  }

  _disabled(feature, message) {
    if (this.analytics) this.analytics.recordDisabledFeatureAttempt(feature);
    const error = new Error(message);
    error.statusCode = 403;
    error.reason = "FEATURE_DISABLED";
    error.feature = feature;
    return error;
  }

  assertReferralEnabled() {
    if (!this.featureFlags.isReferralEnabled()) {
      throw this._disabled("referral", "Referral program is currently disabled");
    }
  }

  assertAffiliateEnabled() {
    if (!this.featureFlags.isAffiliateEnabled()) {
      throw this._disabled("affiliate", "Affiliate program is currently disabled");
    }
  }

  assertCouponEnabled() {
    if (!this.featureFlags.isCouponEnabled()) {
      throw this._disabled("coupons", "Coupons are currently disabled");
    }
  }

  assertPromotionEnabled() {
    if (!this.featureFlags.isPromotionEnabled()) {
      throw this._disabled("promotions", "Promotions are currently disabled");
    }
  }

  assertCommissionRulesEnabled() {
    if (!this.featureFlags.isCommissionRulesEnabled()) {
      throw this._disabled("commissionRules", "Commission rules are currently disabled");
    }
  }

  assertRewardLedgerEnabled() {
    if (!this.featureFlags.isRewardLedgerEnabled()) {
      throw this._disabled("rewardLedger", "Reward ledger is currently disabled");
    }
  }
}

module.exports = GrowthOperationGuard;
