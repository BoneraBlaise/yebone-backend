const cloudinary = require("cloudinary");

/**
 * Shared Cloudinary upload helper — consolidates controller upload logic.
 */
class UploadService {
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
