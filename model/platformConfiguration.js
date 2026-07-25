const mongoose = require("mongoose");

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    section: { type: String, default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    admin: { type: String, required: true },
    reason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const platformConfigurationSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true, index: true },
    version: { type: Number, default: 1 },
    businessValues: { type: Object, required: true },
    auditLog: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlatformConfiguration ||
  mongoose.model("PlatformConfiguration", platformConfigurationSchema);
