const fs = require("fs/promises");
const path = require("path");
const StorageProvider = require("./StorageProvider");

class LocalStorageAdapter extends StorageProvider {
  constructor({ basePath = "./storage/uploads" } = {}) {
    super();
    this.basePath = basePath;
  }

  _resolveKey(key) {
    const safeKey = String(key).replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.basePath, safeKey);
  }

  async upload(key, data, metadata = {}) {
    const filePath = this._resolveKey(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await fs.writeFile(filePath, buffer);
    return {
      key,
      url: this.getUrl(key),
      size: buffer.length,
      metadata,
      mode: "local",
    };
  }

  async download(key) {
    const filePath = this._resolveKey(key);
    const buffer = await fs.readFile(filePath);
    return { key, data: buffer, mode: "local" };
  }

  async delete(key) {
    const filePath = this._resolveKey(key);
    await fs.unlink(filePath);
    return { key, deleted: true, mode: "local" };
  }

  async exists(key) {
    const filePath = this._resolveKey(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key) {
    return `/storage/${String(key).replace(/^\/+/, "")}`;
  }
}

module.exports = LocalStorageAdapter;
