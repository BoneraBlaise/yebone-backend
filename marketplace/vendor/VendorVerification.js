/**
 * Vendor verification workflow — admin verify/unverify operations.
 */
class VendorVerification {
  constructor({ shopService, lifecycle }) {
    this.shopService = shopService;
    this.lifecycle = lifecycle;
  }

  async verify(shopId) {
    const shop = await this.shopService.setVerified(shopId, true);
    return {
      shop,
      lifecycle: this.lifecycle.afterVerification(shop, true),
    };
  }

  async unverify(shopId) {
    const shop = await this.shopService.setVerified(shopId, false);
    return {
      shop,
      lifecycle: this.lifecycle.afterVerification(shop, false),
    };
  }

  getStatus(shop = {}) {
    return {
      isVerified: Boolean(shop.isVerified),
      state: this.lifecycle.resolveState(shop),
    };
  }
}

module.exports = VendorVerification;
