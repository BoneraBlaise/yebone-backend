const CommissionConfig = {
  version: "7.0.0-foundation",
  decimalPlaces: 2,
  strategies: Object.freeze([
    "GLOBAL",
    "VENDOR",
    "CATEGORY",
    "BRAND",
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
    BRAND: 4,
    CATEGORY: 5,
    VENDOR: 6,
    SUBSCRIPTION: 7,
    GLOBAL: 8,
  }),
  additiveStrategies: Object.freeze(["REFERRAL", "COUPON"]),
  rateTypes: Object.freeze(["PERCENTAGE", "FIXED"]),
  defaultCurrency: "UGX",
};

module.exports = CommissionConfig;
