const mongoose = require("mongoose");

const messagesSchema = new mongoose.Schema(
  {
    conversationId: { type: String, index: true },
    text: { type: String },
    sender: { type: String, index: true },
    messageType: {
      type: String,
      enum: ["text", "image", "offer", "system"],
      default: "text",
    },
    offerId: { type: String, default: null },
    productSnapshot: { type: Object, default: null },
    readBy: { type: [String], default: [] },
    images: {
      public_id: { type: String },
      url: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Messages", messagesSchema);
