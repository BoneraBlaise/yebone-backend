const mongoose = require("mongoose");

const configurationHistorySchema = new mongoose.Schema(
  {
    historyId: { type: String, required: true, unique: true, index: true },
    module: { type: String, required: true, index: true },
    section: { type: String, default: null, index: true },
    action: {
      type: String,
      enum: ["draft.save", "publish", "rollback"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "rollback"],
      required: true,
      index: true,
    },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    changedBy: { type: String, required: true, index: true },
    note: { type: String, default: null },
    version: { type: Number, default: 1 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

configurationHistorySchema.index({ module: 1, timestamp: -1 });
configurationHistorySchema.index({ changedBy: 1, timestamp: -1 });

module.exports =
  mongoose.models.ConfigurationHistory ||
  mongoose.model("ConfigurationHistory", configurationHistorySchema);
