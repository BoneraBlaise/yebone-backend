const mongoose = require("mongoose");

const SUBSCRIPTION_STATUS = ["active", "trial", "expired", "cancelled", "suspended"];

const vendorAISubscriptionSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    planId: {
      type: String,
      default: "starter",
      index: true,
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUS,
      default: "trial",
      index: true,
    },
    trialEndsAt: { type: Date, default: null },
    renewalDate: { type: Date, default: null },
    monthlyCredits: { type: Number, default: 100 },
    products: { type: [String], default: ["virtual_try_on", "ai_product_description"] },
    usageThisMonth: { type: Number, default: 0 },
    maxUsagePerMonth: { type: Number, default: 1000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.VendorAISubscription ||
  mongoose.model("VendorAISubscription", vendorAISubscriptionSchema);

module.exports.SUBSCRIPTION_STATUS = SUBSCRIPTION_STATUS;
