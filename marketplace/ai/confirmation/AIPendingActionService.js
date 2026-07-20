const crypto = require("crypto");

class AIPendingActionService {
  constructor({ config, audit } = {}) {
    this.config = config;
    this.audit = audit;
    this.store = new Map();
  }

  _ttlMs() {
    return Number(this.config?.pendingActionTtlMs || 15 * 60 * 1000);
  }

  _secret() {
    return String(this.config?.confirmationSecret || "yebo-ai-dev-confirmation-secret");
  }

  _payloadHash(payload = {}) {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  _checksum(record) {
    const canonical = JSON.stringify({
      pendingActionId: record.pendingActionId,
      sessionId: record.sessionId,
      requestedBy: record.requestedBy,
      vendorId: record.vendorId || null,
      toolId: record.toolId,
      action: record.action,
      payloadHash: record.payloadHash,
    });
    return crypto.createHmac("sha256", this._secret()).update(canonical).digest("hex");
  }

  _isExpired(record) {
    return new Date(record.expiresAt).getTime() <= Date.now();
  }

  _expireIfNeeded(record) {
    if (record.status === "pending" && this._isExpired(record)) {
      record.status = "expired";
      this.store.set(record.pendingActionId, record);
      this.audit?.expired({
        pendingActionId: record.pendingActionId,
        sessionId: record.sessionId,
        userId: record.requestedBy,
        vendorId: record.vendorId,
        toolId: record.toolId,
        intent: record.intent,
        action: record.action,
        correlationId: record.correlationId,
      });
      return true;
    }
    return record.status === "expired";
  }

  cleanup() {
    for (const [id, record] of this.store.entries()) {
      if (this._isExpired(record) || ["consumed", "cancelled", "expired"].includes(record.status)) {
        if (Date.now() - new Date(record.createdAt).getTime() > this._ttlMs() * 2) {
          this.store.delete(id);
        }
      }
    }
  }

  create({
    sessionId,
    requestedBy,
    vendorId = null,
    toolId,
    action,
    intent,
    payload = {},
    summary,
    correlationId = null,
  } = {}) {
    this.cleanup();
    const pendingActionId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this._ttlMs()).toISOString();
    const payloadHash = this._payloadHash(payload);

    const record = {
      pendingActionId,
      sessionId,
      requestedBy,
      vendorId,
      toolId,
      action,
      intent,
      payload,
      payloadHash,
      summary,
      correlationId,
      createdAt,
      expiresAt,
      status: "pending",
    };

    record.actionChecksum = this._checksum(record);
    this.store.set(pendingActionId, record);

    this.audit?.requested({
      pendingActionId,
      sessionId,
      userId: requestedBy,
      vendorId,
      toolId,
      intent,
      action,
      correlationId,
    });

    return {
      pendingActionId,
      sessionId,
      actionChecksum: record.actionChecksum,
      createdAt,
      expiresAt,
      summary,
      toolId,
      action,
    };
  }

  get(pendingActionId) {
    const record = this.store.get(String(pendingActionId));
    if (!record) return null;
    this._expireIfNeeded(record);
    return record;
  }

  cancel(pendingActionId, { sessionId, userId, vendorId } = {}) {
    const record = this.get(pendingActionId);
    if (!record) return { ok: false, reason: "PENDING_ACTION_NOT_FOUND" };
    if (record.status === "consumed") return { ok: false, reason: "REPLAY_DETECTED" };
    if (record.status === "cancelled") return { ok: true, record };
    if (record.status === "expired") return { ok: false, reason: "PENDING_ACTION_EXPIRED" };
    const actorIds = [userId, vendorId].filter(Boolean);
    if (record.sessionId !== sessionId || !actorIds.includes(record.requestedBy)) {
      return { ok: false, reason: "SESSION_MISMATCH" };
    }
    record.status = "cancelled";
    this.store.set(record.pendingActionId, record);
    this.audit?.cancelled({
      pendingActionId: record.pendingActionId,
      sessionId: record.sessionId,
      userId: record.requestedBy,
      vendorId: record.vendorId,
      toolId: record.toolId,
      intent: record.intent,
      action: record.action,
      correlationId: record.correlationId,
    });
    return { ok: true, record };
  }

  consume(pendingActionId) {
    const record = this.store.get(String(pendingActionId));
    if (!record) return null;
    if (record.status !== "pending") return null;
    record.status = "consumed";
    this.store.set(pendingActionId, record);
    return record;
  }
}

module.exports = AIPendingActionService;
