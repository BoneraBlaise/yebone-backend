/**
 * Registry for webhook handlers — interfaces only.
 */
class WebhookRegistry {
  constructor() {
    this.handlers = new Map();
  }

  register(providerCode, handler) {
    this.handlers.set(providerCode, handler);
    return this;
  }

  get(providerCode) {
    return this.handlers.get(providerCode) || null;
  }

  list() {
    return [...this.handlers.keys()];
  }
}

module.exports = WebhookRegistry;
