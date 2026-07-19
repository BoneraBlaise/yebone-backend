class GrowthCommerceAIService {
  constructor({ campaignRepository, homepageService, featureFlags } = {}) {
    this.campaignRepository = campaignRepository;
    this.homepageService = homepageService;
    this.featureFlags = featureFlags;
  }

  _enabled() {
    if (!this.featureFlags) return true;
    return this.featureFlags.isEnabledSync("growthCommerce", "aiIntegration.enabled");
  }

  async recommend(input = {}) {
    if (!this._enabled()) {
      return { recommendations: [], meta: { enabled: false } };
    }

    const activeCampaigns = await this.campaignRepository.list({ status: "active" });
    const homepage = this.homepageService ? await this.homepageService.resolvePublicHomepage() : { sections: {} };

    const flashSales = activeCampaigns.filter((c) => c.type === "flash_sale");
    const featured = activeCampaigns.filter((c) => c.type === "featured_campaign");
    const bestDeals = [...activeCampaigns]
      .sort((a, b) => (b.discountValue || 0) - (a.discountValue || 0))
      .slice(0, input.limit || 5);

    const recommendations = [];

    for (const campaign of bestDeals) {
      recommendations.push({
        type: "campaign",
        campaignId: campaign.campaignId,
        title: campaign.name,
        reason: campaign.type === "flash_sale" ? "flash_sale" : "best_deal",
        discountType: campaign.discountType,
        discountValue: campaign.discountValue,
      });
    }

    if (homepage.sections?.featuredProducts?.enabled) {
      recommendations.push({
        type: "homepage_section",
        section: "featuredProducts",
        title: "Featured products",
        reason: "featured_products",
      });
    }

    return {
      recommendations,
      campaigns: activeCampaigns.slice(0, input.limit || 10),
      flashSales,
      featured,
      bestDeals,
      meta: {
        enabled: true,
        count: recommendations.length,
        source: "growth-commerce",
      },
    };
  }
}

module.exports = GrowthCommerceAIService;
