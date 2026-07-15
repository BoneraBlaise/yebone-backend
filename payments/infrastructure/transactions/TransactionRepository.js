const PaymentTransaction = require("./PaymentTransaction.model");

/**
 * MongoDB repository for payment_transactions collection.
 */
class TransactionRepository {
  constructor({ model = PaymentTransaction } = {}) {
    this.model = model;
  }

  async ensureIndexes() {
    try {
      await this.model.createIndexes();
    } catch (error) {
      if (error?.code !== 85 && error?.codeName !== "IndexOptionsConflict") {
        throw error;
      }
    }
  }

  async create(record) {
    const doc = await this.model.create(record);
    return doc.toObject();
  }

  async findByTransactionId(transactionId) {
    return this.model.findOne({ transactionId }).lean();
  }

  async findByPaymentReference(paymentReference) {
    if (!paymentReference) return null;
    return this.model.findOne({ paymentReference }).sort({ createdAt: -1 }).lean();
  }

  async findByProviderReference(providerReference) {
    if (!providerReference) return null;
    return this.model.findOne({ providerReference }).sort({ createdAt: -1 }).lean();
  }

  async findByOrderId(orderId) {
    if (!orderId) return null;
    return this.model.findOne({ orderId }).sort({ createdAt: -1 }).lean();
  }

  async listByBuyerId(buyerId, { limit = 50, skip = 0 } = {}) {
    if (!buyerId) return [];
    return this.model
      .find({ buyerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async listBySellerId(sellerId, { limit = 50, skip = 0 } = {}) {
    if (!sellerId) return [];
    return this.model
      .find({ sellerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Atomically transition status when current status matches expected value.
   */
  async transitionStatus(transactionId, fromStatus, toStatus, patch = {}) {
    const updated = await this.model
      .findOneAndUpdate(
        { transactionId, status: fromStatus },
        { $set: { status: toStatus, ...patch } },
        { new: true }
      )
      .lean();

    return updated;
  }

  async countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }
}

module.exports = TransactionRepository;
