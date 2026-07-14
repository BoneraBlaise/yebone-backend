const mongoose = require("mongoose");
const IdempotencyConfig = require("./IdempotencyConfig");

const { PROCESSING, COMPLETED, FAILED } = IdempotencyConfig.recordStatus;

const idempotencyRecordSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
    scope: {
      type: String,
      trim: true,
      default: null,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: null,
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
    fingerprint: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [PROCESSING, COMPLETED, FAILED],
      required: true,
      default: PROCESSING,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: IdempotencyConfig.collectionName,
    timestamps: true,
  }
);

// Primary idempotency guard — one record per scoped key
idempotencyRecordSchema.index(
  { scope: 1, idempotencyKey: 1 },
  { unique: true, name: "uniq_scope_idempotency_key" }
);

// Each inbound requestId should appear at most once when provided explicitly
idempotencyRecordSchema.index(
  { requestId: 1 },
  { unique: true, name: "uniq_request_id" }
);

// Lookup by correlation ID for tracing
idempotencyRecordSchema.index(
  { correlationId: 1 },
  { name: "idx_correlation_id" }
);

// Lookup by payment reference for reconciliation
idempotencyRecordSchema.index(
  { paymentReference: 1 },
  { sparse: true, name: "idx_payment_reference" }
);

// TTL — MongoDB removes expired documents automatically
idempotencyRecordSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_expires_at" }
);

// Stale PROCESSING cleanup queries
idempotencyRecordSchema.index(
  { status: 1, createdAt: 1 },
  { name: "idx_status_created_at" }
);

const IdempotencyRecord =
  mongoose.models.IdempotencyRecord ||
  mongoose.model("IdempotencyRecord", idempotencyRecordSchema);

module.exports = IdempotencyRecord;
