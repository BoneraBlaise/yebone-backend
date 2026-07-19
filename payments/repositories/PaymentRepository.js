const crypto = require("crypto");
const PaymentRecord = require("../../model/paymentRecord");

/**
 * Payment repository — in-memory with Mongo persistence for integration phase.
 */
class PaymentRepository {
  constructor({ persist = true } = {}) {
    this.persist = persist;
    this.payments = new Map();
    this.byOrder = new Map();
  }

  _id() {
    return `pay_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  async saveOrderPayment(orderPayment) {
    const paymentId = orderPayment.paymentId || this._id();
    const record = {
      paymentId,
      orderId: String(orderPayment.orderId),
      userId: String(orderPayment.userId),
      amount: Number(orderPayment.amount),
      currency: orderPayment.currency || "RWF",
      method: orderPayment.method || "CARD",
      status: orderPayment.status,
      clientSecret: orderPayment.clientSecret || `pending_${paymentId}`,
      metadata: orderPayment.metadata || {},
      refundedAmount: 0,
    };

    this.payments.set(paymentId, record);
    this.byOrder.set(record.orderId, paymentId);

    if (this.persist) {
      await PaymentRecord.findOneAndUpdate({ paymentId }, record, { upsert: true, new: true });
    }

    return { ...record, paymentId };
  }

  async findOrderPaymentById(id) {
    if (this.payments.has(id)) return this.payments.get(id);
    if (!this.persist) return null;
    const doc = await PaymentRecord.findOne({ paymentId: id }).lean();
    if (doc) this.payments.set(doc.paymentId, doc);
    return doc;
  }

  async findOrderPaymentByOrderId(orderId) {
    const cachedId = this.byOrder.get(String(orderId));
    if (cachedId) return this.payments.get(cachedId);
    if (!this.persist) return null;
    const doc = await PaymentRecord.findOne({ orderId: String(orderId) }).lean();
    if (doc) {
      this.payments.set(doc.paymentId, doc);
      this.byOrder.set(doc.orderId, doc.paymentId);
    }
    return doc;
  }

  async saveSubscriptionPayment(_subscriptionPayment) {
    return this.saveOrderPayment(_subscriptionPayment);
  }

  async updatePaymentStatus(id, status, metadata = {}) {
    const existing = (await this.findOrderPaymentById(id)) || (await this.findOrderPaymentByOrderId(id));
    if (!existing) return null;

    const updated = {
      ...existing,
      status,
      metadata: { ...(existing.metadata || {}), ...metadata },
    };

    this.payments.set(updated.paymentId, updated);
    this.byOrder.set(updated.orderId, updated.paymentId);

    if (this.persist) {
      await PaymentRecord.findOneAndUpdate({ paymentId: updated.paymentId }, updated, { new: true });
    }

    return updated;
  }
}

module.exports = PaymentRepository;
