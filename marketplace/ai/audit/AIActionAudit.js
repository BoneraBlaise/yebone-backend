const PlatformAuditAdapter = require("../../integration/audit/PlatformAuditAdapter");

const EVENTS = Object.freeze({
  REQUESTED: "AI_ACTION_REQUESTED",
  CONFIRMED: "AI_ACTION_CONFIRMED",
  CANCELLED: "AI_ACTION_CANCELLED",
  EXPIRED: "AI_ACTION_EXPIRED",
  EXECUTED: "AI_ACTION_EXECUTED",
  FAILED: "AI_ACTION_FAILED",
});

class AIActionAudit {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
  }

  _record(action, payload = {}) {
    if (!this.enabled) return null;
    return PlatformAuditAdapter.record({
      platform: "yeboAi",
      resource: payload.pendingActionId || payload.toolId || "yebo-ai",
      action,
      actor: payload.userId || "system",
      correlationId: payload.correlationId || null,
      reason: payload.outcome || null,
      metadata: {
        userId: payload.userId || null,
        vendorId: payload.vendorId || null,
        sessionId: payload.sessionId || null,
        pendingActionId: payload.pendingActionId || null,
        toolId: payload.toolId || null,
        intent: payload.intent || null,
        actionName: payload.action || null,
        outcome: payload.outcome || null,
      },
    }).catch(() => null);
  }

  requested(payload) {
    return this._record(EVENTS.REQUESTED, { ...payload, outcome: "requested" });
  }

  confirmed(payload) {
    return this._record(EVENTS.CONFIRMED, { ...payload, outcome: "confirmed" });
  }

  cancelled(payload) {
    return this._record(EVENTS.CANCELLED, { ...payload, outcome: "cancelled" });
  }

  expired(payload) {
    return this._record(EVENTS.EXPIRED, { ...payload, outcome: "expired" });
  }

  executed(payload) {
    return this._record(EVENTS.EXECUTED, { ...payload, outcome: "executed" });
  }

  failed(payload) {
    return this._record(EVENTS.FAILED, { ...payload, outcome: "failed" });
  }
}

module.exports = { AIActionAudit, AI_ACTION_EVENTS: EVENTS };
