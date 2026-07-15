const mongoose = require("mongoose");
const TransactionConfig = require("./TransactionConfig");
const PaymentTransactionStatus = require("./PaymentTransactionStatus");

const STATUSES = Object.values(PaymentTransactionStatus);

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: null,
    },
    providerReference: {
      type: String,
      trim: true,
      default: null,
    },
    providerCode: {
      type: String,
      trim: true,
      default: null,
    },
    orderId: {
      type: String,
      trim: true,
      default: null,
    },
    buyerId: {
      type: String,
      trim: true,
      default: null,
    },
    sellerId: {
      type: String,
      trim: true,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: TransactionConfig.defaultCurrency,
    },
    status: {
      type: String,
      enum: STATUSES,
      required: true,
      default: PaymentTransactionStatus.CREATED,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    capturedAt: {
      type: Date,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: TransactionConfig.collectionName,
    timestamps: true,
  }
);

paymentTransactionSchema.index(
  { transactionId: 1 },
  { unique: true, name: "uniq_transaction_id" }
);

paymentTransactionSchema.index(
  { paymentReference: 1 },
  { sparse: true, name: "idx_payment_reference" }
);

paymentTransactionSchema.index(
  { providerReference: 1 },
  { sparse: true, name: "idx_provider_reference" }
);

paymentTransactionSchema.index(
  { orderId: 1 },
  { sparse: true, name: "idx_order_id" }
);

paymentTransactionSchema.index(
  { buyerId: 1, createdAt: -1 },
  { sparse: true, name: "idx_buyer_created" }
);

paymentTransactionSchema.index(
  { sellerId: 1, createdAt: -1 },
  { sparse: true, name: "idx_seller_created" }
);

paymentTransactionSchema.index(
  { status: 1, createdAt: -1 },
  { name: "idx_status_created" }
);

const PaymentTransaction =
  mongoose.models.PaymentTransaction ||
  mongoose.model("PaymentTransaction", paymentTransactionSchema);

module.exports = PaymentTransaction;
