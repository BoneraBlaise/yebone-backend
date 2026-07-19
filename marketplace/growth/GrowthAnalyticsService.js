class GrowthAnalyticsService {
  constructor() {
    this.metrics = {
      configurationChanges: 0,
      referralUsage: 0,
      couponUsage: 0,
      couponRedemptions: 0,
      couponFailures: 0,
      promotionValidations: 0,
      promotionFailures: 0,
      commissionCreations: 0,
      rewardApprovals: 0,
      disabledFeatureAttempts: 0,
      rejectedRequests: 0,
      ruleExecutions: 0,
      ruleConflicts: 0,
      priorityOverrides: 0,
      brandRuleUsage: 0,
      simulatorExecutions: 0,
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

  recordCouponRedemption() {
    this.metrics.couponRedemptions += 1;
  }

  recordCouponFailure() {
    this.metrics.couponFailures += 1;
  }

  recordPromotionValidation() {
    this.metrics.promotionValidations += 1;
  }

  recordPromotionFailure() {
    this.metrics.promotionFailures += 1;
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

  recordRuleExecution() {
    this.metrics.ruleExecutions += 1;
  }

  recordRuleConflict() {
    this.metrics.ruleConflicts += 1;
  }

  recordPriorityOverride() {
    this.metrics.priorityOverrides += 1;
  }

  recordBrandRuleUsage() {
    this.metrics.brandRuleUsage += 1;
  }

  recordSimulatorExecution() {
    this.metrics.simulatorExecutions += 1;
  }

  getSummary() {
    return Object.freeze({ ...this.metrics });
  }
}

module.exports = GrowthAnalyticsService;
