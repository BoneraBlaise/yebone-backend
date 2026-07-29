const mongoose = require("mongoose");

const TRANSACTION_TYPES = [
  "allocation",
  "consumption",
  "reset",
  "top_up",
  "refund",
  "admin_adjustment",
];

const TRANSACTION_STATUS = ["pending", "completed", "rolled_back"];

const vendorCreditTransactionSchema = new mongoose.Schema(
  {
    vendorId: { type: String, required: true, index: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true, index: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    idempotencyKey: { type: String, default: null, sparse: true, unique: true },
    requestId: { type: String, default: null, index: true },
    serviceType: { type: String, default: null, index: true },
    status: { type: String, enum: TRANSACTION_STATUS, default: "completed", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

vendorCreditTransactionSchema.index({ vendorId: 1, createdAt: -1 });

module.exports =
  mongoose.models.VendorCreditTransaction ||
  mongoose.model("VendorCreditTransaction", vendorCreditTransactionSchema);

module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.TRANSACTION_STATUS = TRANSACTION_STATUS;
