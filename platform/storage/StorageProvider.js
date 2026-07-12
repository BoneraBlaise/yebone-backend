class StorageProvider {
  async upload(_key, _data, _metadata = {}) {
    throw new Error("StorageProvider.upload must be implemented");
  }
  async download(_key) {
    throw new Error("StorageProvider.download must be implemented");
  }
  async delete(_key) {
    throw new Error("StorageProvider.delete must be implemented");
  }
  async exists(_key) {
    throw new Error("StorageProvider.exists must be implemented");
  }
  getUrl(_key) {
    throw new Error("StorageProvider.getUrl must be implemented");
  }
}
module.exports = StorageProvider;
