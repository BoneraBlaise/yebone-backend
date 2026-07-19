const mongoose = require("mongoose");
const { CAMPAIGN_TYPES, CAMPAIGN_STATUSES, PROMOTION_TYPES } = require("../marketplace/growth-commerce/GrowthCommerceSettingsDefaults");

const analyticsSchema = new mongoose.Schema(
  {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { _id: false }
);

const growthCommerceCampaignSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true, unique: true, index: true },
    vendorId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    banner: { type: String, default: "" },
    type: { type: String, enum: CAMPAIGN_TYPES, required: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: "draft", index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    targetProducts: [{ type: String }],
    targetCategories: [{ type: String }],
    targetBrands: [{ type: String }],
    discountType: { type: String, enum: PROMOTION_TYPES, default: "percentage" },
    discountValue: { type: Number, default: 0 },
    promotionRules: { type: mongoose.Schema.Types.Mixed, default: {} },
    budget: { type: Number, default: null },
    homepageSection: { type: String, default: null },
    analytics: { type: analyticsSchema, default: () => ({}) },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GrowthCommerceCampaign", growthCommerceCampaignSchema);
