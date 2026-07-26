const mongoose = require("mongoose");

const communicationOfferSchema = new mongoose.Schema(
  {
    offerId: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "RWF" },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "countered", "expired"],
      default: "pending",
      index: true,
    },
    parentOfferId: { type: String, default: null },
    priceLockToken: { type: String, default: null, index: true },
    expiresAt: { type: Date, required: true },
    orderId: { type: String, default: null },
    productSnapshot: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunicationOffer", communicationOfferSchema);
