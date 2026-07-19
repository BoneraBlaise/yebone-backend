class GrowthAnalyticsService {
  constructor() {
    this.metrics = {
      configurationChanges: 0,
      referralUsage: 0,
      couponUsage: 0,
      promotionValidations: 0,
      commissionCreations: 0,
      rewardApprovals: 0,
      disabledFeatureAttempts: 0,
      rejectedRequests: 0,
    };
  }

  recordConfigurationChange() {
    this.metrics.configurationChanges += 1;
  }

  recordReferralUsage() {
    this.metrics.referralUsage += 1;
  }

  recordCouponUsage() {
    this.metrics.couponUsage += 1;
  }

  recordPromotionValidation() {
    this.metrics.promotionValidations += 1;
  }

  recordCommissionCreation() {
    this.metrics.commissionCreations += 1;
  }

  recordRewardApproval() {
    this.metrics.rewardApprovals += 1;
  }

  recordDisabledFeatureAttempt() {
    this.metrics.disabledFeatureAttempts += 1;
  }

  recordRejectedRequest() {
    this.metrics.rejectedRequests += 1;
  }

  getSummary() {
    return Object.freeze({ ...this.metrics });
  }
}

module.exports = GrowthAnalyticsService;
