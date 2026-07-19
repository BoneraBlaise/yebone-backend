const mongoose = require("mongoose");

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    setting: { type: String, default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    admin: { type: String, required: true },
    reason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const growthConfigurationSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true, index: true },
    settings: { type: Object, required: true },
    commissionRules: { type: Array, default: [] },
    auditLog: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.GrowthConfiguration ||
  mongoose.model("GrowthConfiguration", growthConfigurationSchema);
