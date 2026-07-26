const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: String, required: true, index: true },
    recipientType: { type: String, enum: ["user", "seller"], default: "user" },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    payload: { type: Object, default: {} },
    link: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    sourceModule: { type: String, default: "communication" },
    sourceId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
