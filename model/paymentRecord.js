const mongoose = require("mongoose");

const paymentRecordSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "RWF" },
    method: { type: String, default: "CARD" },
    status: { type: String, required: true, index: true },
    clientSecret: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentRecord", paymentRecordSchema);
