/**
 * Vendor profile — store branding and seller identity updates.
 */
class VendorProfile {
  constructor({ shopService }) {
    this.shopService = shopService;
  }

  async getProfile(shopId) {
    return this.shopService.getProfile(shopId);
  }

  async getPublicInfo(shopId) {
    return this.shopService.getPublicInfo(shopId);
  }

  async updateProfile(shopId, fields) {
    return this.shopService.updateProfile(shopId, fields);
  }

  async updateAvatar(shopId, avatarData) {
    return this.shopService.updateAvatar(shopId, avatarData);
  }
}

module.exports = VendorProfile;
