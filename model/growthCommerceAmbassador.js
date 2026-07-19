const mongoose = require("mongoose");

const growthCommerceAmbassadorSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    campaignIds: [{ type: String }],
    referralCode: { type: String, default: null, index: true },
    stats: {
      clicks: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GrowthCommerceAmbassador", growthCommerceAmbassadorSchema);
