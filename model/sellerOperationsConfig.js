const mongoose = require("mongoose");

const sellerOperationsConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    settings: { type: Object, default: {} },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SellerOperationsConfig", sellerOperationsConfigSchema);
