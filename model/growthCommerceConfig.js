const mongoose = require("mongoose");
const { GrowthCommerceSettingsDefaults } = require("../marketplace/growth-commerce/GrowthCommerceSettingsDefaults");

const growthCommerceConfigSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: () => structuredClone(GrowthCommerceSettingsDefaults) },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GrowthCommerceConfig", growthCommerceConfigSchema);
