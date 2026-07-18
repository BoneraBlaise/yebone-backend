/**
 * Courier health probe.
 */
class CourierHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    return Object.freeze({
      healthy: Boolean(this.platform && this.platform.repository),
      version: this.platform.config.version,
      name: this.platform.config.name,
      phase: this.platform.config.phase,
      repositoryReady: Boolean(this.platform.repository),
      historyReady: Boolean(this.platform.history),
      deliveryIntegrated: Boolean(this.platform.deliveryPlatform),
      analyticsReady: Boolean(this.platform.analytics),
    });
  }
}

module.exports = CourierHealth;
