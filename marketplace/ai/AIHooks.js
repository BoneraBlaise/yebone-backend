/**
 * AI lifecycle hooks — observability and extension points.
 */
class AIHooks {
  constructor() {
    this.handlers = {
      beforeTurn: [],
      afterTool: [],
      afterResponse: [],
      onInjectionDetected: [],
    };
  }

  register(event, handler) {
    if (!this.handlers[event]) {
      throw new Error(`AIHooks: unknown event ${event}`);
    }
    if (typeof handler === "function") {
      this.handlers[event].push(handler);
    }
    return true;
  }

  async emit(event, payload = {}) {
    const list = this.handlers[event] || [];
    for (const handler of list) {
      await handler(payload);
    }
    return payload;
  }

  snapshot() {
    return Object.freeze({
      beforeTurn: this.handlers.beforeTurn.length,
      afterTool: this.handlers.afterTool.length,
      afterResponse: this.handlers.afterResponse.length,
      onInjectionDetected: this.handlers.onInjectionDetected.length,
    });
  }
}

module.exports = AIHooks;
