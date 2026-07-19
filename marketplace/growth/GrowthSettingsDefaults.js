/**
 * Default Growth Platform configuration (Phase 9.0+).
 */
const GrowthSettingsDefaults = Object.freeze({
  affiliate: { enabled: true },
  referral: { enabled: true },
  coupons: { enabled: true },
  promotions: { enabled: true },
  commissionRules: { enabled: true },
  rewardLedger: { enabled: true },
});

const STRATEGY_LABELS = Object.freeze({
  GLOBAL: "Platform Default",
  CATEGORY: "Category",
  BRAND: "Brand",
  VENDOR: "Vendor",
  PRODUCT: "Product",
  REFERRAL: "Referral",
  CAMPAIGN: "Campaign",
});

const DEFAULT_COMMISSION_RULES = Object.freeze([
  {
    id: "global-platform-default",
    name: "Platform Default",
    description: "Default platform commission rate",
    strategy: "GLOBAL",
    rateType: "PERCENTAGE",
    rate: 10,
    priority: 8,
    enabled: true,
    archived: false,
    scope: {},
    startDate: null,
    endDate: null,
    createdBy: "system",
    updatedBy: "system",
    reason: "Initial default",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "referral-default",
    name: "Referral Default",
    description: "Default referral commission rate",
    strategy: "REFERRAL",
    rateType: "PERCENTAGE",
    rate: 5,
    priority: 10,
    enabled: true,
    archived: false,
    scope: {},
    startDate: null,
    endDate: null,
    createdBy: "system",
    updatedBy: "system",
    reason: "Initial default",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

module.exports = { GrowthSettingsDefaults, DEFAULT_COMMISSION_RULES, STRATEGY_LABELS };
