/**
 * In-memory transaction link repository — independent from legacy and Module 2 stores.
 */
class TransactionLinkRepository {
  constructor() {
    this.store = [];
    this.byLegacy = new Map();
    this.byModule2 = new Map();
    this.byProviderReference = new Map();
    this.byPaymentReference = new Map();
    this.byOrderId = new Map();
    this.byCorrelationId = new Map();
  }

  async save(link) {
    const existing = this.byModule2.get(link.module2TransactionId);
    if (existing) {
      return { ...existing };
    }

    this.store.push(link);
    this._index(link);
    return { ...link };
  }

  async findByLegacyTransactionId(legacyTransactionId) {
    return this._clone(this.byLegacy.get(String(legacyTransactionId).trim()) || null);
  }

  async findByModule2TransactionId(module2TransactionId) {
    return this._clone(this.byModule2.get(String(module2TransactionId).trim()) || null);
  }

  async findByProviderReference(providerReference) {
    return this._clone(this.byProviderReference.get(String(providerReference).trim()) || null);
  }

  async findByPaymentReference(paymentReference) {
    return this._clone(this.byPaymentReference.get(String(paymentReference).trim()) || null);
  }

  async findByOrderId(orderId) {
    return this._clone(this.byOrderId.get(String(orderId).trim()) || null);
  }

  async findByCorrelationId(correlationId) {
    return this._clone(this.byCorrelationId.get(String(correlationId).trim()) || null);
  }

  _index(link) {
    if (link.legacyTransactionId) {
      this.byLegacy.set(link.legacyTransactionId, link);
    }
    this.byModule2.set(link.module2TransactionId, link);
    if (link.providerReference) {
      this.byProviderReference.set(link.providerReference, link);
    }
    if (link.paymentReference) {
      this.byPaymentReference.set(link.paymentReference, link);
    }
    if (link.orderId) {
      this.byOrderId.set(link.orderId, link);
    }
    if (link.correlationId) {
      this.byCorrelationId.set(link.correlationId, link);
    }
  }

  _clone(link) {
    return link ? { ...link } : null;
  }
}

module.exports = TransactionLinkRepository;
