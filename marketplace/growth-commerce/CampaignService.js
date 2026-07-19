const CampaignStateMachine = require("./CampaignStateMachine");
const { CAMPAIGN_TYPES, PROMOTION_TYPES } = require("./GrowthCommerceSettingsDefaults");
const PlatformAuditAdapter = require("../integration/audit/PlatformAuditAdapter");

class CampaignService {
  constructor({ repository, stateMachine, audit, observability } = {}) {
    this.repository = repository;
    this.stateMachine = stateMachine || new CampaignStateMachine();
    this.audit = audit;
    this.observability = observability;
  }

  _error(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _validatePayload(payload = {}) {
    if (!payload.name) throw this._error("Campaign name is required");
    if (!payload.type || !CAMPAIGN_TYPES.includes(payload.type)) {
      throw this._error(`Invalid campaign type: ${payload.type}`);
    }
    if (payload.discountType && !PROMOTION_TYPES.includes(payload.discountType)) {
      throw this._error(`Invalid promotion type: ${payload.discountType}`);
    }
  }

  async createCampaign(vendorId, payload = {}, { actor = "system", correlationId = null } = {}) {
    this._validatePayload(payload);
    const campaign = await this.repository.create({
      ...payload,
      vendorId: String(vendorId),
      status: payload.status || "draft",
    });

    if (this.audit) {
      await this.audit.record({
        platform: "growth-commerce",
        resource: campaign.campaignId,
        action: "campaign.created",
        actor,
        correlationId,
        newValue: { name: campaign.name, type: campaign.type, status: campaign.status },
      });
    }
    if (this.observability) this.observability.increment("campaignCreations");
    return campaign;
  }

  async duplicateCampaign(vendorId, campaignId, { actor = "system" } = {}) {
    const source = await this.repository.findById(campaignId);
    if (!source || String(source.vendorId) !== String(vendorId)) {
      throw this._error("Campaign not found", 404);
    }

    const { campaignId: _id, analytics, createdAt, updatedAt, ...rest } = source;
    return this.createCampaign(
      vendorId,
      {
        ...rest,
        name: `${source.name} (Copy)`,
        status: "draft",
      },
      { actor }
    );
  }

  async updateStatus(campaignId, nextStatus, { vendorId = null, actor = "system", correlationId = null } = {}) {
    const campaign = await this.repository.findById(campaignId);
    if (!campaign) throw this._error("Campaign not found", 404);
    if (vendorId && String(campaign.vendorId) !== String(vendorId)) {
      throw this._error("Forbidden", 403);
    }

    const transition = this.stateMachine.assertTransition(campaign.status, nextStatus);
    if (!transition.valid) throw this._error(transition.message, 409);

    const updated = await this.repository.update(campaignId, { status: transition.status });
    if (this.audit) {
      await this.audit.record({
        platform: "growth-commerce",
        resource: campaignId,
        action: "campaign.status_changed",
        actor,
        correlationId,
        oldValue: campaign.status,
        newValue: updated.status,
      });
    }
    return updated;
  }

  async listCampaigns(filters = {}) {
    return this.repository.list(filters);
  }

  async getCampaign(campaignId, { vendorId = null } = {}) {
    const campaign = await this.repository.findById(campaignId);
    if (!campaign) throw this._error("Campaign not found", 404);
    if (vendorId && String(campaign.vendorId) !== String(vendorId)) {
      throw this._error("Forbidden", 403);
    }
    return campaign;
  }

  async updateCampaign(campaignId, vendorId, patch = {}, { actor = "system" } = {}) {
    const campaign = await this.getCampaign(campaignId, { vendorId });
    if (["expired", "archived"].includes(campaign.status)) {
      throw this._error("Cannot update archived/expired campaign", 409);
    }

    const allowed = [
      "name",
      "description",
      "banner",
      "startDate",
      "endDate",
      "targetProducts",
      "targetCategories",
      "targetBrands",
      "discountType",
      "discountValue",
      "promotionRules",
      "budget",
      "homepageSection",
    ];
    const update = {};
    for (const key of allowed) {
      if (patch[key] !== undefined) update[key] = patch[key];
    }

    return this.repository.update(campaignId, update);
  }

  async recordMetric(campaignId, metric, amount = 1) {
    if (!["views", "clicks", "orders", "revenue"].includes(metric)) {
      throw this._error("Invalid metric");
    }
    return this.repository.incrementAnalytics(campaignId, { [metric]: amount });
  }

  computeDashboardMetrics(campaigns = []) {
    const totals = { views: 0, clicks: 0, orders: 0, revenue: 0 };
    for (const campaign of campaigns) {
      const analytics = campaign.analytics || {};
      totals.views += analytics.views || 0;
      totals.clicks += analytics.clicks || 0;
      totals.orders += analytics.orders || 0;
      totals.revenue += analytics.revenue || 0;
    }
    const ctr = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;
    return {
      ...totals,
      ctr: Number(ctr.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      campaignCount: campaigns.length,
    };
  }
}

module.exports = CampaignService;
