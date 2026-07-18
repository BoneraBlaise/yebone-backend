/**
 * Product media helpers — wraps upload service usage patterns.
 */
class ProductMedia {
  constructor({ uploadService }) {
    this.uploadService = uploadService;
  }

  async uploadImages(images) {
    return this.uploadService.uploadImages(images, "products");
  }

  async destroyImages(images = []) {
    for (const image of images) {
      if (!image?.public_id) continue;
      await this.uploadService.destroyPublicId(image.public_id);
    }
  }
}

module.exports = ProductMedia;
