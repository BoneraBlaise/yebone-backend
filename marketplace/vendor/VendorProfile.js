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

  async getPublicStorefront(shopId) {
    return this.shopService.getPublicStorefront(shopId);
  }

  async updateCover(shopId, coverData) {
    return this.shopService.updateCover(shopId, coverData);
  }

  async updateGallery(shopId, galleryItems) {
    return this.shopService.updateGallery(shopId, galleryItems);
  }

  async updateBusinessStatus(shopId, status) {
    return this.shopService.updateBusinessStatus(shopId, status);
  }

  async toggleFollow(shopId, userId) {
    return this.shopService.toggleFollow(shopId, userId);
  }

  async toggleFavorite(shopId, userId) {
    return this.shopService.toggleFavorite(shopId, userId);
  }

  async getFollowState(shopId, userId) {
    return this.shopService.getFollowState(shopId, userId);
  }
}

module.exports = VendorProfile;
