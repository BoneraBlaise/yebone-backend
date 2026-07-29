const mongoose = require("mongoose");

const vendorCreditsWalletSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    currentCredits: { type: Number, default: 0, min: 0 },
    monthlyAllocation: { type: Number, default: 0, min: 0 },
    consumedCredits: { type: Number, default: 0, min: 0 },
    cycleStartedAt: { type: Date, default: Date.now },
    nextResetAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.VendorCreditsWallet ||
  mongoose.model("VendorCreditsWallet", vendorCreditsWalletSchema);
