class GrowthCommerceSearchBridge {
  constructor({ campaignRepository, featureFlags } = {}) {
    this.campaignRepository = campaignRepository;
    this.featureFlags = featureFlags;
  }

  _enabled() {
    if (!this.featureFlags) return true;
    return this.featureFlags.isEnabledSync("growthCommerce", "searchIntegration.enabled");
  }

  async enrichProductResults(result = {}) {
    if (!this._enabled()) return result;

    const activeCampaigns = await this.campaignRepository.list({ status: "active" });
    const productCampaignMap = new Map();

    for (const campaign of activeCampaigns) {
      for (const productId of campaign.targetProducts || []) {
        if (!productCampaignMap.has(String(productId))) productCampaignMap.set(String(productId), []);
        productCampaignMap.get(String(productId)).push({
          campaignId: campaign.campaignId,
          name: campaign.name,
          type: campaign.type,
          discountType: campaign.discountType,
          discountValue: campaign.discountValue,
          badge:
            campaign.type === "flash_sale"
              ? "Flash Sale"
              : campaign.discountValue
              ? `${campaign.discountValue}${campaign.discountType === "percentage" ? "%" : ""} Off`
              : "Promo",
        });
      }
    }

    const products = (result.products || []).map((product) => {
      const productId = String(product._id || product.id);
      const campaigns = productCampaignMap.get(productId) || [];
      return {
        ...product,
        growthCommerce: {
          campaigns,
          promotionBadges: campaigns.map((c) => c.badge),
          featured: campaigns.some((c) => c.type === "featured_campaign"),
          flashSale: campaigns.some((c) => c.type === "flash_sale"),
        },
      };
    });

    return {
      ...result,
      products,
      meta: {
        ...(result.meta || {}),
        growthCommerce: {
          activeCampaigns: activeCampaigns.length,
          highlightedProducts: products.filter((p) => p.growthCommerce?.campaigns?.length).length,
        },
      },
    };
  }

  async searchProducts(query = {}) {
    const { getSearchPlatform } = require("../index");
    const searchPlatform = getSearchPlatform();
    const result = await searchPlatform.searchProducts(query);
    return this.enrichProductResults(result);
  }
}

module.exports = GrowthCommerceSearchBridge;
