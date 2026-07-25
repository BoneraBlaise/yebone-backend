const crypto = require("crypto");

class TrustBuyerProtectionRepository {
  constructor() {
    this.protections = new Map();
    this.disputes = new Map();
    this.escrows = new Map();
    this.verifications = new Map();
    this.trustScores = new Map();
    this.fraudAlerts = new Map();
    this.protectionHistory = new Map();
    this.orders = new Map();
  }

  resetForTests() {
    this.protections.clear();
    this.disputes.clear();
    this.escrows.clear();
    this.verifications.clear();
    this.trustScores.clear();
    this.fraudAlerts.clear();
    this.protectionHistory.clear();
    this.orders.clear();
  }

  _id(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  }

  seedOrder(order) {
    const id = String(order.orderId || order._id || order.id);
    this.orders.set(id, structuredClone({ ...order, orderId: id }));
    return this.orders.get(id);
  }

  async getOrder(orderId) {
    const item = this.orders.get(String(orderId));
    return item ? structuredClone(item) : null;
  }

  async createProtection(orderId, payload) {
    const record = {
      protectionId: payload.protectionId || this._id("prot"),
      orderId: String(orderId),
      buyerId: String(payload.buyerId),
      sellerId: String(payload.sellerId),
      status: payload.status || "active",
      eligible: payload.eligible !== false,
      policySnapshot: payload.policySnapshot || {},
      expiresAt: payload.expiresAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.protections.set(record.protectionId, record);
    return structuredClone(record);
  }

  async getProtection(protectionId) {
    const item = this.protections.get(String(protectionId));
    return item ? structuredClone(item) : null;
  }

  async getProtectionByOrder(orderId) {
    const item = [...this.protections.values()].find((p) => p.orderId === String(orderId));
    return item ? structuredClone(item) : null;
  }

  async updateProtection(protectionId, patch) {
    const existing = this.protections.get(String(protectionId));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      protectionId: existing.protectionId,
      updatedAt: new Date().toISOString(),
    };
    this.protections.set(existing.protectionId, updated);
    return structuredClone(updated);
  }

  async listProtections(filters = {}) {
    return [...this.protections.values()]
      .filter((item) => {
        if (filters.buyerId && item.buyerId !== String(filters.buyerId)) return false;
        if (filters.sellerId && item.sellerId !== String(filters.sellerId)) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async appendProtectionHistory(protectionId, entry) {
    const key = String(protectionId);
    const list = this.protectionHistory.get(key) || [];
    list.push({ ...entry, at: new Date().toISOString() });
    this.protectionHistory.set(key, list);
    return structuredClone(list);
  }

  async getProtectionHistory(protectionId) {
    return structuredClone(this.protectionHistory.get(String(protectionId)) || []);
  }

  async createDispute(payload) {
    const dispute = {
      disputeId: payload.disputeId || this._id("disp"),
      orderId: String(payload.orderId),
      buyerId: String(payload.buyerId),
      sellerId: String(payload.sellerId),
      reason: payload.reason || "",
      description: payload.description || "",
      attachments: payload.attachments || [],
      status: payload.status || "OPEN",
      timeline: payload.timeline || [],
      assignedAdmin: payload.assignedAdmin || null,
      resolution: payload.resolution || null,
      auditTrail: payload.auditTrail || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.disputes.set(dispute.disputeId, dispute);
    return structuredClone(dispute);
  }

  async getDispute(disputeId) {
    const item = this.disputes.get(String(disputeId));
    return item ? structuredClone(item) : null;
  }

  async getDisputeByOrder(orderId) {
    const item = [...this.disputes.values()].find((d) => d.orderId === String(orderId));
    return item ? structuredClone(item) : null;
  }

  async updateDispute(disputeId, patch) {
    const existing = this.disputes.get(String(disputeId));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      disputeId: existing.disputeId,
      updatedAt: new Date().toISOString(),
    };
    this.disputes.set(existing.disputeId, updated);
    return structuredClone(updated);
  }

  async listDisputes(filters = {}) {
    return [...this.disputes.values()]
      .filter((item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.buyerId && item.buyerId !== String(filters.buyerId)) return false;
        if (filters.sellerId && item.sellerId !== String(filters.sellerId)) return false;
        if (filters.assignedAdmin && item.assignedAdmin !== String(filters.assignedAdmin)) return false;
        if (filters.orderId && item.orderId !== String(filters.orderId)) return false;
        return true;
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((item) => structuredClone(item));
  }

  async createEscrow(orderId, payload) {
    const record = {
      escrowId: payload.escrowId || this._id("esc"),
      orderId: String(orderId),
      buyerId: String(payload.buyerId),
      sellerId: String(payload.sellerId),
      amount: Number(payload.amount || 0),
      currency: payload.currency || "RWF",
      status: payload.status || "PENDING",
      transitions: payload.transitions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.escrows.set(record.escrowId, record);
    return structuredClone(record);
  }

  async getEscrow(escrowId) {
    const item = this.escrows.get(String(escrowId));
    return item ? structuredClone(item) : null;
  }

  async getEscrowByOrder(orderId) {
    const item = [...this.escrows.values()].find((e) => e.orderId === String(orderId));
    return item ? structuredClone(item) : null;
  }

  async updateEscrow(escrowId, patch) {
    const existing = this.escrows.get(String(escrowId));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      escrowId: existing.escrowId,
      updatedAt: new Date().toISOString(),
    };
    this.escrows.set(existing.escrowId, updated);
    return structuredClone(updated);
  }

  async listEscrows(filters = {}) {
    return [...this.escrows.values()]
      .filter((item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.buyerId && item.buyerId !== String(filters.buyerId)) return false;
        if (filters.sellerId && item.sellerId !== String(filters.sellerId)) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async createVerification(subjectId, payload) {
    const record = {
      verificationId: payload.verificationId || this._id("ver"),
      subjectId: String(subjectId),
      subjectType: payload.subjectType || "customer",
      type: payload.type,
      status: payload.status || "Pending",
      evidence: payload.evidence || {},
      reviewedBy: payload.reviewedBy || null,
      expiresAt: payload.expiresAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.verifications.set(record.verificationId, record);
    return structuredClone(record);
  }

  async getVerification(verificationId) {
    const item = this.verifications.get(String(verificationId));
    return item ? structuredClone(item) : null;
  }

  async listVerifications(filters = {}) {
    return [...this.verifications.values()]
      .filter((item) => {
        if (filters.subjectId && item.subjectId !== String(filters.subjectId)) return false;
        if (filters.subjectType && item.subjectType !== filters.subjectType) return false;
        if (filters.type && item.type !== filters.type) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async updateVerification(verificationId, patch) {
    const existing = this.verifications.get(String(verificationId));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      verificationId: existing.verificationId,
      updatedAt: new Date().toISOString(),
    };
    this.verifications.set(existing.verificationId, updated);
    return structuredClone(updated);
  }

  async upsertTrustScore(subjectId, payload) {
    const record = {
      subjectId: String(subjectId),
      subjectType: payload.subjectType || "customer",
      score: Number(payload.score ?? 50),
      factors: payload.factors || {},
      weights: payload.weights || {},
      computedAt: new Date().toISOString(),
    };
    this.trustScores.set(record.subjectId, record);
    return structuredClone(record);
  }

  async getTrustScore(subjectId) {
    const item = this.trustScores.get(String(subjectId));
    return item ? structuredClone(item) : null;
  }

  async listTrustScores() {
    return [...this.trustScores.values()].map((item) => structuredClone(item));
  }

  async createFraudAlert(payload) {
    const alert = {
      alertId: payload.alertId || this._id("fraud"),
      subjectId: String(payload.subjectId),
      subjectType: payload.subjectType || "customer",
      riskLevel: payload.riskLevel || "LOW",
      signals: payload.signals || [],
      status: payload.status || "open",
      reviewedBy: payload.reviewedBy || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.fraudAlerts.set(alert.alertId, alert);
    return structuredClone(alert);
  }

  async listFraudAlerts(filters = {}) {
    return [...this.fraudAlerts.values()]
      .filter((item) => {
        if (filters.riskLevel && item.riskLevel !== filters.riskLevel) return false;
        if (filters.status && item.status !== filters.status) return false;
        return true;
      })
      .map((item) => structuredClone(item));
  }

  async updateFraudAlert(alertId, patch) {
    const existing = this.fraudAlerts.get(String(alertId));
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      alertId: existing.alertId,
      updatedAt: new Date().toISOString(),
    };
    this.fraudAlerts.set(existing.alertId, updated);
    return structuredClone(updated);
  }
}

module.exports = TrustBuyerProtectionRepository;
