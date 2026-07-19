const GrowthConfigurationPlatform = require("./GrowthConfigurationPlatform");
const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");
const ReferralAttributionService = require("./ReferralAttributionService");
const CouponValidationService = require("./CouponValidationService");
const PromotionValidationService = require("./PromotionValidationService");
const GrowthCommissionOrchestrator = require("./GrowthCommissionOrchestrator");
const RewardLedgerService = require("./RewardLedgerService");
const Commission = require("../../model/commission");

class GrowthPlatform {
  constructor(options = {}) {
    this.configPlatform = options.configPlatform || new GrowthConfigurationPlatform(options);
    this.legacy = options.legacy || new GrowthLegacyAdapter();
    this.analytics = this.configPlatform.analytics;
    this.attribution = options.attribution || new ReferralAttributionService(options.attributionOptions);
    this.couponValidator = new CouponValidationService({ legacy: this.legacy });
    this.promotionValidator = new PromotionValidationService({
      legacy: this.legacy,
      couponValidator: this.couponValidator,
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
      phase: "9.0",
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

  resolveReferralCode({ referralCode, attributionTokens = [] } = {}) {
    const fromToken = this.attribution.resolveReferralFromTokens(attributionTokens);
    return fromToken || referralCode || null;
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
    else this.analytics.recordRejectedRequest();
    return result;
  }

  async validatePromotion(input) {
    this.configPlatform.getGuard().assertPromotionEnabled();
    const result = await this.promotionValidator.validate(input);
    this.analytics.recordPromotionValidation();
    if (!result.valid) this.analytics.recordRejectedRequest();
    return result;
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
