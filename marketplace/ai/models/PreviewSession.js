const mongoose = require("mongoose");

const PREVIEW_STATUS = ["pending", "processing", "completed", "failed", "expired"];

const previewSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    vendorId: { type: String, required: true, index: true },
    customerId: { type: String, default: null, index: true },
    productId: { type: String, required: true, index: true },
    previewType: { type: String, required: true, index: true },
    status: { type: String, enum: PREVIEW_STATUS, default: "completed", index: true },
    progress: { type: Number, default: 100, min: 0, max: 100 },
    requestId: { type: String, default: null },
    creditsConsumed: { type: Number, default: 0 },
    imageGeneration: { type: Boolean, default: false },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

previewSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.PreviewSession ||
  mongoose.model("PreviewSession", previewSessionSchema);

module.exports.PREVIEW_STATUS = PREVIEW_STATUS;
