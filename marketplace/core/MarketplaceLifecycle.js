/**
 * Marketplace lifecycle states for core bootstrap.
 */
class MarketplaceLifecycle {
  constructor() {
    this.state = "created";
    this.startedAt = null;
    this.initializedAt = null;
  }

  markStarting() {
    this.state = "starting";
    this.startedAt = new Date().toISOString();
  }

  markReady() {
    this.state = "ready";
    this.initializedAt = new Date().toISOString();
  }

  snapshot() {
    return Object.freeze({
      state: this.state,
      startedAt: this.startedAt,
      initializedAt: this.initializedAt,
    });
  }
}

module.exports = MarketplaceLifecycle;
