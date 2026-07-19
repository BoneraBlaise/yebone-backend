const GrowthConfigurationPlatform = require("./GrowthConfigurationPlatform");
const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");
const ReferralAttributionService = require("./ReferralAttributionService");
const CouponValidationService = require("./CouponValidationService");
const PromotionValidationService = require("./PromotionValidationService");
const GrowthCommissionOrchestrator = require("./GrowthCommissionOrchestrator");
const RewardLedgerService = require("./RewardLedgerService");
const CommissionRuleAdminService = require("./CommissionRuleAdminService");
const CommissionRuleSimulatorService = require("./CommissionRuleSimulatorService");
const CouponRedemptionService = require("./CouponRedemptionService");
const CouponStatisticsService = require("./CouponStatisticsService");
const Commission = require("../../model/commission");

class GrowthPlatform {
  constructor(options = {}) {
    this.configPlatform = options.configPlatform || new GrowthConfigurationPlatform(options);
    this.legacy = options.legacy || new GrowthLegacyAdapter();
    this.analytics = this.configPlatform.analytics;
    this.attribution = options.attribution || new ReferralAttributionService(options.attributionOptions);
    this.couponValidator = new CouponValidationService({ legacy: this.legacy });
    this.couponRedemption = new CouponRedemptionService({
      couponValidator: this.couponValidator,
      analytics: this.analytics,
    });
    this.couponStats = new CouponStatisticsService();
    this.promotionValidator = new PromotionValidationService({
      legacy: this.legacy,
      couponValidator: this.couponValidator,
    });
    this.commissionRules = new CommissionRuleAdminService({
      store: this.configPlatform.getStore(),
      audit: this.configPlatform.audit,
      analytics: this.analytics,
    });
    this.ruleSimulator = new CommissionRuleSimulatorService({
      ruleAdmin: this.commissionRules,
      analytics: this.analytics,
    });
    this.commission = new GrowthCommissionOrchestrator({
      configStore: this.configPlatform.getStore(),
      legacy: this.legacy,
      analytics: this.analytics,
    });
    this.rewardLedger = new RewardLedgerService({ legacy: this.legacy });
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.configPlatform.initialize();
      this.initialized = true;
    }
    return this.health();
  }

  health() {
    return {
      healthy: true,
      phase: "9.1",
      version: this.configPlatform.config.version,
      features: this.configPlatform.getFeatureFlags().getPublicFeatures(),
    };
  }

  getConfigurationPlatform() {
    return this.configPlatform;
  }

  getGuard() {
    return this.configPlatform.getGuard();
  }

  getCommissionRuleAdmin() {
    return this.commissionRules;
  }

  getCommissionAnalytics() {
    return this.analytics.getSummary();
  }

  async joinReferralProgram(userId) {
    this.configPlatform.getGuard().assertReferralEnabled();
    return this.commission.joinProgram(userId);
  }

  async getReferralProfile(userId) {
    const commission = await this.legacy.findCommissionByUserId(userId);
    if (!commission) return { isCommissioner: false };
    return {
      isCommissioner: true,
      referralCode: commission.referralCode,
      balance: commission.balance,
      clicks: commission.clicks,
    };
  }

  createAttributionToken(payload) {
    this.configPlatform.getGuard().assertReferralEnabled();
    this.analytics.recordReferralUsage();
    return this.attribution.createAttributionToken(payload);
  }

  verifyAttributionToken(token) {
    return this.attribution.verifyAttributionToken(token);
  }

  resolveReferralCode({ referralCode, attributionTokens = [], requireToken = false } = {}) {
    const fromToken = this.attribution.resolveReferralFromTokens(attributionTokens);
    if (fromToken) return fromToken;
    if (requireToken) return null;
    return referralCode || null;
  }

  async cancelOrderCommission(orderId, referralCode, reason = "cancelled") {
    this.configPlatform.getGuard().assertCommissionEnabled();
    return this.commission.cancelOrderCommission(orderId, referralCode, reason);
  }

  async trackReferralClick(referralCode) {
    this.configPlatform.getGuard().assertReferralEnabled();
    const commission = await this.legacy.findCommissionByReferralCode(referralCode);
    if (!commission) {
      this.analytics.recordRejectedRequest();
      return { tracked: false, reason: "INVALID_REFERRAL_CODE" };
    }
    commission.clicks += 1;
    await commission.save();
    this.analytics.recordReferralUsage();
    return { tracked: true };
  }

  async validateCoupon(input) {
    this.configPlatform.getGuard().assertCouponEnabled();
    const result = await this.couponValidator.validate(input);
    if (result.valid) this.analytics.recordCouponUsage();
    else {
      this.analytics.recordRejectedRequest();
      this.analytics.recordCouponFailure();
    }
    return result;
  }

  async validatePromotion(input) {
    this.configPlatform.getGuard().assertPromotionEnabled();
    const result = input.unified
      ? await this.promotionValidator.validateUnified(input)
      : await this.promotionValidator.validate(input);
    this.analytics.recordPromotionValidation();
    if (!result.valid) {
      this.analytics.recordRejectedRequest();
      this.analytics.recordPromotionFailure();
    }
    return result;
  }

  async redeemCouponForOrder(input) {
    this.configPlatform.getGuard().assertCouponEnabled();
    return this.couponRedemption.validateAndRedeem(input);
  }

  async getCouponStatistics() {
    this.configPlatform.getGuard().assertCouponEnabled();
    return this.couponStats.getStatistics();
  }

  async getCouponUsage(options) {
    this.configPlatform.getGuard().assertCouponEnabled();
    return this.couponStats.getUsage(options?.limit);
  }

  simulateCommissionRule(input) {
    this.configPlatform.getGuard().assertCommissionRulesEnabled();
    return this.ruleSimulator.simulate(input);
  }

  async processOrderCommission(order, referralCode, session, options) {
    this.configPlatform.getGuard().assertCommissionRulesEnabled();
    return this.commission.processOrderCommission(order, referralCode, session, options);
  }

  async settleOrderCommission(orderId, referralCode) {
    this.configPlatform.getGuard().assertRewardLedgerEnabled();
    return this.commission.settleOrderCommission(orderId, referralCode);
  }

  async getRewardLedger(userId, options) {
    this.configPlatform.getGuard().assertRewardLedgerEnabled();
    return this.rewardLedger.getLedgerForUser(userId, options);
  }

  async generateShareLink(userId, productId, frontendUrl) {
    this.configPlatform.getGuard().assertAffiliateEnabled();
    let commission = await this.legacy.findCommissionByUserId(userId);
    if (!commission) {
      await this.joinReferralProgram(userId);
      commission = await Commission.findOne({ user: userId });
    }
    await this.trackReferralClick(commission.referralCode);
    const token = this.createAttributionToken({
      referralCode: commission.referralCode,
      productId,
    });
    const shareLink = `${frontendUrl}/product/${productId}?ref=${commission.referralCode}&att=${token}`;
    return { shareLink, referralCode: commission.referralCode, attributionToken: token };
  }
}

module.exports = GrowthPlatform;
