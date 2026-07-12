const CloudStorageProvider = require("./CloudStorageProvider");

class CloudinaryAdapterPlaceholder extends CloudStorageProvider {
  constructor({ cloudName = "", apiKey = "", apiSecret = "" } = {}) {
    super();
    this.cloudName = cloudName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  _placeholderResponse(operation, key) {
    return {
      mode: "placeholder",
      provider: "cloudinary",
      operation,
      key,
      message: "Cloudinary adapter not configured — placeholder response",
    };
  }

  async upload(key, _data, metadata = {}) {
    return { ...this._placeholderResponse("upload", key), metadata, url: `https://placeholder.cloudinary.com/${key}` };
  }

  async download(key) {
    return { ...this._placeholderResponse("download", key), data: Buffer.alloc(0) };
  }

  async delete(key) {
    return { ...this._placeholderResponse("delete", key), deleted: false };
  }

  async exists(_key) {
    return false;
  }

  getUrl(key) {
    return `https://placeholder.cloudinary.com/${key}`;
  }

  async transform(key, options = {}) {
    return { ...this._placeholderResponse("transform", key), options };
  }
}

module.exports = CloudinaryAdapterPlaceholder;
