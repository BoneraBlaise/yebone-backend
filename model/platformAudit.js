const mongoose = require("mongoose");

const platformAuditSchema = new mongoose.Schema(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    correlationId: { type: String, index: true },
    transactionId: { type: String, index: true },
    orderId: { type: String, index: true },
    platform: { type: String, required: true, index: true },
    resource: { type: String, default: null, index: true },
    actor: { type: String, required: true },
    action: { type: String, required: true, index: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model("PlatformAudit", platformAuditSchema);
