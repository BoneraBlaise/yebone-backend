const HOMEPAGE_SECTION_DEFAULTS = Object.freeze({
  heroBanner: { enabled: true, title: "", subtitle: "", imageUrl: "", ctaLink: "/", campaignId: null },
  featuredProducts: { enabled: true, source: "campaign", productIds: [], campaignId: null, limit: 12 },
  trendingProducts: { enabled: true, limit: 12 },
  flashSaleSection: { enabled: true, campaignId: null, limit: 8 },
  campaignBanner: { enabled: true, campaignId: null, title: "", imageUrl: "" },
  topVendors: { enabled: true, limit: 8 },
  newArrivals: { enabled: true, limit: 12 },
  bestSellers: { enabled: true, limit: 12 },
});

const GrowthCommerceSettingsDefaults = Object.freeze({
  campaigns: { enabled: true },
  promotions: { enabled: true },
  homepage: { enabled: true },
  affiliates: { enabled: true },
  ambassadors: { enabled: true },
  marketingDashboard: { enabled: true },
  automation: { enabled: true },
  searchIntegration: { enabled: true },
  aiIntegration: { enabled: true },
});

const CAMPAIGN_TYPES = Object.freeze([
  "flash_sale",
  "scheduled_sale",
  "weekend_sale",
  "holiday_sale",
  "featured_campaign",
]);

const CAMPAIGN_STATUSES = Object.freeze([
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "archived",
]);

const PROMOTION_TYPES = Object.freeze([
  "percentage",
  "fixed_amount",
  "buy_x_get_y",
  "spend_x_save_y",
  "category",
  "brand",
  "vendor",
]);

module.exports = {
  GrowthCommerceSettingsDefaults,
  HOMEPAGE_SECTION_DEFAULTS,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  PROMOTION_TYPES,
};
