/**
 * Default Growth Platform configuration (Phase 9.0).
 */
const GrowthSettingsDefaults = Object.freeze({
  affiliate: { enabled: true },
  referral: { enabled: true },
  coupons: { enabled: true },
  promotions: { enabled: true },
  commissionRules: { enabled: true },
  rewardLedger: { enabled: true },
});

const DEFAULT_COMMISSION_RULES = Object.freeze([
  {
    id: "global-platform-default",
    strategy: "GLOBAL",
    rateType: "PERCENTAGE",
    rate: 10,
    enabled: true,
    scope: {},
  },
  {
    id: "referral-default",
    strategy: "REFERRAL",
    rateType: "PERCENTAGE",
    rate: 5,
    enabled: true,
    scope: {},
  },
]);

module.exports = { GrowthSettingsDefaults, DEFAULT_COMMISSION_RULES };
