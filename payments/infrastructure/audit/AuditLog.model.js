const mongoose = require("mongoose");
const AuditConfig = require("./AuditConfig");
const { ActorType, ResourceType } = require("./AuditEvent");
const ImmutableAuditError = require("./errors/ImmutableAuditError");

const actorTypes = Object.values(ActorType);
const resourceTypes = Object.values(ResourceType);

const auditLogSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      required: true,
      trim: true,
    },
    correlationId: {
      type: String,
      required: true,
      trim: true,
    },
    requestId: {
      type: String,
      required: true,
      trim: true,
    },
    actorId: {
      type: String,
      required: true,
      trim: true,
    },
    actorType: {
      type: String,
      enum: actorTypes,
      required: true,
    },
    resourceType: {
      type: String,
      enum: resourceTypes,
      required: true,
    },
    resourceId: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
    device: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: AuditConfig.collectionName,
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  }
);

function blockMutation(next) {
  next(new ImmutableAuditError());
}

auditLogSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "remove",
    "findOneAndRemove",
  ],
  blockMutation
);

auditLogSchema.pre("save", function blockDocumentMutation(next) {
  if (!this.isNew) {
    return next(new ImmutableAuditError());
  }
  next();
});

auditLogSchema.index({ auditId: 1 }, { unique: true, name: "uniq_audit_id" });
auditLogSchema.index({ correlationId: 1, createdAt: -1 }, { name: "idx_correlation_created" });
auditLogSchema.index({ requestId: 1 }, { name: "idx_request_id" });
auditLogSchema.index({ actorId: 1, createdAt: -1 }, { name: "idx_actor_created" });
auditLogSchema.index(
  { resourceType: 1, resourceId: 1, createdAt: -1 },
  { name: "idx_resource_created" }
);
auditLogSchema.index({ action: 1, createdAt: -1 }, { name: "idx_action_created" });
auditLogSchema.index({ createdAt: -1 }, { name: "idx_created_at" });

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
