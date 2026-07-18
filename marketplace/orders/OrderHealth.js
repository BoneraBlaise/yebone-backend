/**
 * Order health probe — integrates with Marketplace Core without modifying core/.
 */
class OrderHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    return Object.freeze({
      healthy: Boolean(this.platform.marketplaceCore && this.platform.orderService),
      version: this.platform.config.version,
      name: this.platform.config.name,
      marketplaceIntegrated: Boolean(this.platform.marketplaceCore),
      orderServiceReady: Boolean(this.platform.orderService),
      paymentHooksReady: Boolean(this.platform.marketplaceCore?.hooks?.payment),
    });
  }
}

module.exports = OrderHealth;
