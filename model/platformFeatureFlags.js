const mongoose = require("mongoose");

const platformFeatureFlagsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    growth: { type: mongoose.Schema.Types.Mixed, default: {} },
    delivery: { type: mongoose.Schema.Types.Mixed, default: {} },
    search: { type: mongoose.Schema.Types.Mixed, default: {} },
    marketplace: { type: mongoose.Schema.Types.Mixed, default: {} },
    ai: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformFeatureFlags", platformFeatureFlagsSchema);
