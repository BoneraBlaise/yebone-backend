const mongoose = require("mongoose");

const orderIdempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    scope: {
      type: String,
      default: "order_create",
      index: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed"],
      required: true,
    },
    requestHash: {
      type: String,
      default: null,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

orderIdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports =
  mongoose.models.OrderIdempotencyRecord ||
  mongoose.model("OrderIdempotencyRecord", orderIdempotencySchema);
