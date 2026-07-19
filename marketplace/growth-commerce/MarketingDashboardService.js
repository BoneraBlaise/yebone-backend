class MarketingDashboardService {
  constructor({ campaignService, campaignRepository } = {}) {
    this.campaignService = campaignService;
    this.campaignRepository = campaignRepository;
  }

  async getVendorDashboard(vendorId) {
    const campaigns = await this.campaignRepository.list({ vendorId: String(vendorId) });
    const metrics = this.campaignService.computeDashboardMetrics(campaigns);

    const topProducts = [];
    const productTotals = new Map();
    for (const campaign of campaigns) {
      for (const productId of campaign.targetProducts || []) {
        const current = productTotals.get(productId) || { productId, campaigns: 0, revenue: 0 };
        current.campaigns += 1;
        current.revenue += campaign.analytics?.revenue || 0;
        productTotals.set(productId, current);
      }
    }
    topProducts.push(
      ...[...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    );

    const topCampaigns = [...campaigns]
      .sort((a, b) => (b.analytics?.revenue || 0) - (a.analytics?.revenue || 0))
      .slice(0, 10)
      .map((c) => ({
        campaignId: c.campaignId,
        name: c.name,
        status: c.status,
        analytics: c.analytics,
        roi:
          c.budget && c.budget > 0
            ? Number((((c.analytics?.revenue || 0) - c.budget) / c.budget) * 100).toFixed(2)
            : null,
      }));

    return {
      metrics,
      topProducts,
      topCampaigns,
      campaigns,
    };
  }

  async getAdminDashboard() {
    const campaigns = await this.campaignRepository.list({});
    const metrics = this.campaignService.computeDashboardMetrics(campaigns);
    const byVendor = new Map();

    for (const campaign of campaigns) {
      const current = byVendor.get(campaign.vendorId) || { vendorId: campaign.vendorId, campaigns: 0, revenue: 0 };
      current.campaigns += 1;
      current.revenue += campaign.analytics?.revenue || 0;
      byVendor.set(campaign.vendorId, current);
    }

    return {
      marketplaceMetrics: metrics,
      topVendors: [...byVendor.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      scheduledCampaigns: campaigns.filter((c) => c.status === "scheduled").length,
    };
  }
}

module.exports = MarketingDashboardService;
