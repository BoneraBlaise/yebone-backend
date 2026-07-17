/**
 * AI hook registry placeholder — no AI execution in Marketplace Core v1.
 */
class AiHookRegistry {
  constructor() {
    this.enabled = false;
  }

  register(_name, _handler) {
    return false;
  }

  snapshot() {
    return Object.freeze({ enabled: this.enabled, handlers: [] });
  }
}

module.exports = AiHookRegistry;
