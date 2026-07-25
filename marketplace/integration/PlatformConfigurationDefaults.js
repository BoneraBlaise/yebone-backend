/**
 * Default platform business values — PRE-PHASE 15 control centers.
 * All values are persisted in MongoDB and editable from Super Admin UI.
 */

const PLATFORM_CATEGORIES = Object.freeze([
  "phones",
  "fashion",
  "shoes",
  "furniture",
  "beauty",
  "gaming",
  "computers",
  "events",
  "property",
  "mobility",
  "auction",
  "flash_sale",
]);

const defaultCategoryCommission = () => ({
  percentage: 10,
  fixedFee: 0,
  minFee: 0,
  maxFee: null,
  priority: 5,
  enabled: true,
});

const buildCategoryCommissions = () =>
  Object.fromEntries(PLATFORM_CATEGORIES.map((id) => [id, defaultCategoryCommission()]));

const defaultReferralCategoryRate = () => ({
  phones: 0.5,
  fashion: 2,
  shoes: 1,
  furniture: 1.5,
  beauty: 2,
  gaming: 1,
  computers: 0.5,
  events: 1,
  property: 0.5,
  mobility: 0.5,
  auction: 1,
  flash_sale: 1.5,
});

const AI_PRODUCTS = Object.freeze([
  { id: "yebo_ai_search", name: "YEBO AI Search", description: "Natural language marketplace search" },
  { id: "virtual_try_on", name: "Virtual Try-On", description: "Visual try-on for fashion & beauty" },
  { id: "ai_product_description", name: "AI Product Description", description: "Auto-generate product copy" },
  { id: "ai_translation", name: "AI Translation", description: "Multi-language listing translation" },
  { id: "background_removal", name: "Background Removal", description: "Clean product imagery" },
  { id: "image_upscaler", name: "Image Upscaler", description: "Enhance listing photos" },
  { id: "future_ai_modules", name: "Future AI Modules", description: "Reserved for upcoming AI products" },
]);

const defaultAiProduct = () => ({
  enabled: true,
  monthlyPrice: 15000,
  promotionPrice: null,
  freeTrialDays: 7,
  creditsIncluded: 100,
  creditPrice: 150,
  maxUsagePerMonth: 1000,
  vendorEligibility: "all",
});

const buildAiProducts = () =>
  Object.fromEntries(AI_PRODUCTS.map(({ id }) => [id, defaultAiProduct()]));

const BANNER_TYPES = Object.freeze([
  "homepage_hero",
  "property_banner",
  "events_banner",
  "flash_sale_banner",
  "popup_banner",
  "category_banner",
  "auction_banner",
]);

const PlatformConfigurationDefaults = Object.freeze({
  version: 1,
  categoryCommissions: buildCategoryCommissions(),
  referral: {
    minPayout: 5000,
    maxPayout: 500000,
    commissionCap: 50000,
    cookieDurationDays: 30,
    linkExpirationDays: 90,
    categoryRates: defaultReferralCategoryRate(),
  },
  aiProducts: buildAiProducts(),
  deliveryPricing: {
    baseFee: 2000,
    perKm: 500,
    heavyPackage: 1500,
    nightFee: 1000,
    expressFee: 2500,
    largePackage: 2000,
  },
  deliveryZones: {
    supportedDistricts: ["Kigali", "Gasabo", "Kicukiro", "Nyarugenge"],
    coverageNote: "Yebone Delivery network — activate when ready",
  },
  deliveryPartners: {
    courierPartners: [],
    futureRiders: true,
  },
  ruleEngine: {
    stackingMode: "additive",
    minCommission: 0,
    maxCommission: null,
    seasonalCommission: { enabled: false, rate: 0, startDate: null, endDate: null },
    campaignOverrides: { enabled: true },
    priorityRules: { enabled: true },
    exceptions: [],
  },
  pricing: {
    verificationPrice: 5000,
    featuredPrice: 10000,
    sponsoredPrice: 15000,
    searchBoostPrice: 8000,
    auctionFee: 2.5,
    flashSaleFee: 3,
    eventListingPrice: 5000,
    vendorSubscriptionMonthly: 25000,
  },
  couponDefaults: {
    maxDiscountPercent: 50,
    maxUsesPerUser: 3,
    defaultExpiryDays: 30,
  },
  banners: [],
});

module.exports = {
  PlatformConfigurationDefaults,
  PLATFORM_CATEGORIES,
  AI_PRODUCTS,
  BANNER_TYPES,
  defaultCategoryCommission,
  defaultAiProduct,
};
