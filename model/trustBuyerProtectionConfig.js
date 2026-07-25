const mongoose = require("mongoose");

const trustBuyerProtectionConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    settings: { type: Object, default: {} },
    policies: { type: Object, default: {} },
    trustWeights: { type: Object, default: {} },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrustBuyerProtectionConfig", trustBuyerProtectionConfigSchema);
