const mongoose = require("mongoose");

const auditEntrySchema = new mongoose.Schema(
  {
    setting: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    admin: { type: String, required: true },
    reason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const deliveryConfigurationSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true, index: true },
    settings: { type: Object, required: true },
    auditLog: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DeliveryConfiguration ||
  mongoose.model("DeliveryConfiguration", deliveryConfigurationSchema);
