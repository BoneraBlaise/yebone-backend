const CommissionConfig = {
  version: "7.0.0-foundation",
  decimalPlaces: 2,
  strategies: Object.freeze([
    "GLOBAL",
    "VENDOR",
    "CATEGORY",
    "CAMPAIGN",
    "REFERRAL",
    "SUBSCRIPTION",
    "PRODUCT",
    "FLASH_SALE",
    "COUPON",
    "MANUAL_OVERRIDE",
  ]),
  resolutionPriority: Object.freeze({
    MANUAL_OVERRIDE: 0,
    FLASH_SALE: 1,
    CAMPAIGN: 2,
    PRODUCT: 3,
    VENDOR: 4,
    CATEGORY: 5,
    SUBSCRIPTION: 6,
    GLOBAL: 7,
  }),
  additiveStrategies: Object.freeze(["REFERRAL", "COUPON"]),
  rateTypes: Object.freeze(["PERCENTAGE", "FIXED"]),
  defaultCurrency: "UGX",
};

module.exports = CommissionConfig;
