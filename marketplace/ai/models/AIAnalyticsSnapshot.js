const mongoose = require("mongoose");

const aiAnalyticsSnapshotSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      enum: ["daily", "monthly"],
      required: true,
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    requests: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    vendorUsage: { type: mongoose.Schema.Types.Mixed, default: {} },
    customerUsage: { type: mongoose.Schema.Types.Mixed, default: {} },
    serviceUsage: { type: mongoose.Schema.Types.Mixed, default: {} },
    providerUsage: { type: mongoose.Schema.Types.Mixed, default: {} },
    revenue: { type: Number, default: 0 },
    providerCost: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedMargin: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

aiAnalyticsSnapshotSchema.index({ period: 1, periodKey: 1 }, { unique: true });

module.exports =
  mongoose.models.AIAnalyticsSnapshot ||
  mongoose.model("AIAnalyticsSnapshot", aiAnalyticsSnapshotSchema);
