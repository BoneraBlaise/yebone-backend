const mongoose = require("mongoose");

const aiRequestIdempotencySchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    vendorId: { type: String, default: null, index: true },
    serviceType: { type: String, default: null },
    requestId: { type: String, default: null },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    response: { type: mongoose.Schema.Types.Mixed, default: null },
    creditsDebited: { type: Number, default: 0 },
    transactionId: { type: String, default: null },
  },
  { timestamps: true }
);

aiRequestIdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports =
  mongoose.models.AIRequestIdempotency ||
  mongoose.model("AIRequestIdempotency", aiRequestIdempotencySchema);
