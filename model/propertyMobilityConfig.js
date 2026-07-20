const mongoose = require("mongoose");

const propertyMobilityConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    settings: { type: Object, default: {} },
    pricing: { type: Object, default: {} },
    featureToggles: { type: Object, default: {} },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PropertyMobilityConfig", propertyMobilityConfigSchema);
