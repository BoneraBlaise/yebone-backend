/**
 * Delivery health probe.
 */
class DeliveryHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    return Object.freeze({
      healthy: Boolean(this.platform && this.platform.repository),
      version: this.platform.config.version,
      name: this.platform.config.name,
      phase: this.platform.config.phase,
      marketplaceIntegrated: Boolean(this.platform.marketplaceCore),
      repositoryReady: Boolean(this.platform.repository),
      stateMachineReady: Boolean(this.platform.stateMachine),
      trackingReady: Boolean(this.platform.tracking),
      analyticsReady: Boolean(this.platform.analytics),
    });
  }
}

module.exports = DeliveryHealth;
