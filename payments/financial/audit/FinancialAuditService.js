/**
 * Immutable financial audit trail — in-memory only, no database.
 */
class FinancialAuditService {
  constructor() {
    this.records = [];
  }

  record({ category, action, aggregateId, actorId = "system", payload = {}, metadata = {} }) {
    const entry = {
      id: `audit_${this.records.length + 1}`,
      category,
      action,
      aggregateId,
      actorId,
      payload,
      metadata,
      recordedAt: new Date().toISOString(),
      immutable: true,
    };
    this.records.push(Object.freeze(entry));
    return entry;
  }

  recordPayment(action, aggregateId, payload, metadata) {
    return this.record({ category: "payment", action, aggregateId, payload, metadata });
  }

  recordRefund(action, aggregateId, payload, metadata) {
    return this.record({ category: "refund", action, aggregateId, payload, metadata });
  }

  recordEscrow(action, aggregateId, payload, metadata) {
    return this.record({ category: "escrow", action, aggregateId, payload, metadata });
  }

  recordWallet(action, aggregateId, payload, metadata) {
    return this.record({ category: "wallet", action, aggregateId, payload, metadata });
  }

  recordSubscription(action, aggregateId, payload, metadata) {
    return this.record({ category: "subscription", action, aggregateId, payload, metadata });
  }

  recordCommission(action, aggregateId, payload, metadata) {
    return this.record({ category: "commission", action, aggregateId, payload, metadata });
  }

  recordPayout(action, aggregateId, payload, metadata) {
    return this.record({ category: "payout", action, aggregateId, payload, metadata });
  }

  recordSettlement(action, aggregateId, payload, metadata) {
    return this.record({ category: "settlement", action, aggregateId, payload, metadata });
  }

  getRecords(filter = {}) {
    return this.records.filter((r) => {
      if (filter.category && r.category !== filter.category) return false;
      if (filter.aggregateId && r.aggregateId !== filter.aggregateId) return false;
      return true;
    });
  }
}

module.exports = FinancialAuditService;
