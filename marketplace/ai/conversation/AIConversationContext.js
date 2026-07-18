/**
 * Lightweight in-memory session context — no persistent memory (Phase 7.4).
 */
class AIConversationContext {
  constructor({ ttlMs = 30 * 60 * 1000, maxSessions = 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxSessions = maxSessions;
    this.sessions = new Map();
  }

  _empty(sessionId = null) {
    return {
      sessionId,
      turnCount: 0,
      lastIntent: null,
      lastToolId: null,
      lastToolResult: null,
      lastSearchRequest: null,
      currentProducts: [],
      currentFilters: null,
      currentProduct: null,
      currentVendor: null,
      lastMessage: null,
      updatedAt: Date.now(),
    };
  }

  _purgeExpired(now = Date.now()) {
    for (const [sessionId, context] of this.sessions.entries()) {
      if (now - context.updatedAt > this.ttlMs) {
        this.sessions.delete(sessionId);
      }
    }
    if (this.sessions.size <= this.maxSessions) return;
    const sorted = [...this.sessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    while (this.sessions.size > this.maxSessions) {
      this.sessions.delete(sorted.shift()[0]);
    }
  }

  resolveSessionId(sessionId, userId = null) {
    if (sessionId) return String(sessionId);
    if (userId) return `user-${String(userId)}-${Date.now()}`;
    return null;
  }

  get(sessionId) {
    if (!sessionId) return this._empty();
    this._purgeExpired();
    return this.sessions.get(String(sessionId)) || this._empty(String(sessionId));
  }

  beginTurn(sessionId, { userId = null } = {}) {
    const resolvedId = this.resolveSessionId(sessionId, userId);
    const context = this.get(resolvedId);
    context.turnCount += 1;
    context.updatedAt = Date.now();
    if (resolvedId) this.sessions.set(resolvedId, context);
    return { sessionId: resolvedId, context };
  }

  update(sessionId, patch = {}) {
    if (!sessionId) return this._empty();
    const current = this.get(sessionId);
    const next = {
      ...current,
      ...patch,
      sessionId: String(sessionId),
      updatedAt: Date.now(),
    };
    this.sessions.set(String(sessionId), next);
    return next;
  }

  recordTurn(sessionId, { message, plan, toolResult, toolStrategy, products = [] } = {}) {
    if (!sessionId) return this._empty();

    const patch = {
      lastMessage: message || null,
      lastIntent: plan?.intent?.intent || null,
      lastToolId: plan?.toolId || null,
      lastSearchRequest: plan?.searchRequest || null,
      currentFilters: plan?.searchRequest || null,
      currentProducts: products,
      toolStrategy: toolStrategy || null,
    };

    if (toolStrategy === "reuse") {
      patch.lastToolResult = plan?.reusedToolResult || this.get(sessionId).lastToolResult;
    } else if (toolResult) {
      patch.lastToolResult = toolResult;
    }

    if (products.length === 1) {
      patch.currentProduct = products[0];
    }

    return this.update(sessionId, patch);
  }

  snapshot(sessionId) {
    const context = this.get(sessionId);
    return Object.freeze({
      sessionId: context.sessionId,
      turnCount: context.turnCount,
      lastIntent: context.lastIntent,
      lastToolId: context.lastToolId,
      hasToolResult: Boolean(context.lastToolResult),
      productCount: context.currentProducts?.length || 0,
      hasSearchRequest: Boolean(context.lastSearchRequest),
      updatedAt: context.updatedAt,
    });
  }

  clear(sessionId) {
    if (sessionId) this.sessions.delete(String(sessionId));
  }
}

module.exports = AIConversationContext;
