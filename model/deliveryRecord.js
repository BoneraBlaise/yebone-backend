const mongoose = require("mongoose");

const deliveryRecordSchema = new mongoose.Schema(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    vendorId: { type: String, required: true, index: true },
    courierId: { type: String, default: null, index: true },
    pickupAddress: { type: mongoose.Schema.Types.Mixed, required: true },
    deliveryAddress: { type: mongoose.Schema.Types.Mixed, required: true },
    deliveryFee: { type: Number, default: 0 },
    status: { type: String, required: true, index: true },
    trackingNumber: { type: String, required: true, unique: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryRecord", deliveryRecordSchema);
