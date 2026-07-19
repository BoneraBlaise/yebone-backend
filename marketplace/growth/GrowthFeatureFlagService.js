class GrowthFeatureFlagService {
  constructor(store) {
    if (!store) throw new Error("GrowthFeatureFlagService requires GrowthConfigStore");
    this.store = store;
  }

  _flag(key) {
    return Boolean(this.store.getSettings()?.[key]?.enabled);
  }

  isAffiliateEnabled() {
    return this._flag("affiliate");
  }

  isReferralEnabled() {
    return this._flag("referral");
  }

  isCouponEnabled() {
    return this._flag("coupons");
  }

  isPromotionEnabled() {
    return this._flag("promotions");
  }

  isCommissionRulesEnabled() {
    return this._flag("commissionRules");
  }

  isRewardLedgerEnabled() {
    return this._flag("rewardLedger");
  }

  getPublicFeatures() {
    return {
      affiliate: this.isAffiliateEnabled(),
      referral: this.isReferralEnabled(),
      coupons: this.isCouponEnabled(),
      promotions: this.isPromotionEnabled(),
      commissionRules: this.isCommissionRulesEnabled(),
      rewardLedger: this.isRewardLedgerEnabled(),
    };
  }
}

module.exports = GrowthFeatureFlagService;
