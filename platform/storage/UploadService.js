class UploadService {
  constructor({ provider, maxUploadSizeMb = 100 } = {}) {
    this.provider = provider;
    this.maxUploadSizeMb = maxUploadSizeMb;
  }

  async upload(key, data, metadata = {}) {
    const sizeBytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(String(data));
    const maxBytes = this.maxUploadSizeMb * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      throw new Error(`Upload exceeds maximum size of ${this.maxUploadSizeMb}MB`);
    }
    return this.provider.upload(key, data, metadata);
  }
}

module.exports = UploadService;
