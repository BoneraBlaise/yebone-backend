const StorageProvider = require("./StorageProvider");

/**
 * Cloud storage provider interface — extend for Cloudinary, S3, etc.
 */
class CloudStorageProvider extends StorageProvider {
  async upload(_key, _data, _metadata = {}) {
    throw new Error("CloudStorageProvider.upload must be implemented");
  }

  async download(_key) {
    throw new Error("CloudStorageProvider.download must be implemented");
  }

  async delete(_key) {
    throw new Error("CloudStorageProvider.delete must be implemented");
  }

  async exists(_key) {
    throw new Error("CloudStorageProvider.exists must be implemented");
  }

  getUrl(_key) {
    throw new Error("CloudStorageProvider.getUrl must be implemented");
  }

  async transform(_key, _options = {}) {
    throw new Error("CloudStorageProvider.transform must be implemented");
  }
}

module.exports = CloudStorageProvider;
