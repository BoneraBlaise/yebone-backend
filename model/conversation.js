const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    groupTitle: { type: String, index: true },
    members: { type: Array },
    lastMessage: { type: String },
    lastMessageId: { type: String },
    productId: { type: String, index: true },
    sellerId: { type: String, index: true },
    buyerId: { type: String, index: true },
    contextType: { type: String, default: "product" },
    productSnapshot: { type: Object, default: null },
    archivedBy: { type: [String], default: [] },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
