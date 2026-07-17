const cloudinary = require("cloudinary");

/**
 * Shared Cloudinary upload helper — consolidates controller upload logic.
 */
class UploadService {
  async uploadSingle(image, folder = "products", options = {}) {
    if (!image) {
      const error = new Error("Image payload is required");
      error.statusCode = 400;
      throw error;
    }

    const result = await cloudinary.v2.uploader.upload(image, {
      folder,
      ...options,
    });

    return {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  async destroyPublicId(publicId) {
    if (!publicId) return;
    await cloudinary.v2.uploader.destroy(publicId);
  }

  async uploadImages(images = [], folder = "products") {
    const list = typeof images === "string" ? [images] : images || [];
    const links = [];

    for (const image of list) {
      if (!image) continue;
      const result = await cloudinary.v2.uploader.upload(image, { folder });
      links.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }

    return links;
  }
}

module.exports = UploadService;
