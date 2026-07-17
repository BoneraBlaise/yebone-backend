/**
 * Vendor settings — business info and withdraw method management.
 */
class VendorSettings {
  constructor({ shopService }) {
    this.shopService = shopService;
  }

  async updateBusinessInfo(shopId, fields) {
    return this.shopService.updateProfile(shopId, fields);
  }

  async updateWithdrawMethod(shopId, withdrawMethod) {
    return this.shopService.updateWithdrawMethod(shopId, withdrawMethod);
  }

  async clearWithdrawMethod(shopId) {
    return this.shopService.clearWithdrawMethod(shopId);
  }
}

module.exports = VendorSettings;
