const mongoose = require("mongoose");
const { HOMEPAGE_SECTION_DEFAULTS } = require("../marketplace/growth-commerce/GrowthCommerceSettingsDefaults");

const growthCommerceHomepageSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true },
    sections: { type: mongoose.Schema.Types.Mixed, default: () => structuredClone(HOMEPAGE_SECTION_DEFAULTS) },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GrowthCommerceHomepage", growthCommerceHomepageSchema);
