const StorageProvider = require("./StorageProvider");

/**
 * In-memory storage provider.
 */
class MemoryStorageProvider extends StorageProvider {
  constructor({ baseUrl = "memory://storage" } = {}) {
    super();
    this.baseUrl = baseUrl;
    this.objects = new Map();
  }

  async upload(key, data, metadata = {}) {
    this.objects.set(key, { data, metadata, uploadedAt: new Date().toISOString() });
    return { key, url: this.getUrl(key) };
  }

  async download(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return object.data;
  }

  async delete(key) {
    return this.objects.delete(key);
  }

  async exists(key) {
    return this.objects.has(key);
  }

  getUrl(key) {
    return `${this.baseUrl}/${encodeURIComponent(key)}`;
  }
}

module.exports = MemoryStorageProvider;
