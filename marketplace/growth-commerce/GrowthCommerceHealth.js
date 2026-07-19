class GrowthCommerceHealth {
  static check(platform) {
    const settings = platform.configStore?.getSettings?.() || {};
    return {
      healthy: true,
      phase: "10",
      version: "growth-commerce-v1",
      features: settings,
      services: {
        campaigns: Boolean(platform.campaignService),
        homepage: Boolean(platform.homepageService),
        promotions: Boolean(platform.promotionEngine),
        affiliates: Boolean(platform.affiliateService),
        marketingDashboard: Boolean(platform.marketingDashboard),
        automation: Boolean(platform.automationService),
        searchBridge: Boolean(platform.searchBridge),
        aiService: Boolean(platform.aiService),
      },
    };
  }
}

module.exports = GrowthCommerceHealth;
