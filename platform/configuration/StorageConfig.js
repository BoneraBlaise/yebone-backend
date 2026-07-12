class StorageConfig {
  constructor(env) {
    this.provider = env.get("STORAGE_PROVIDER", "local");
    this.localPath = env.get("STORAGE_LOCAL_PATH", "./storage/uploads");
    this.cloudinaryName = env.get("CLOUDINARY_NAME", "");
    this.cloudinaryApiKey = env.get("CLOUDINARY_API_KEY", "");
    this.cloudinaryApiSecret = env.get("CLOUDINARY_API_SECRET", "");
    this.maxUploadSizeMb = Number(env.get("STORAGE_MAX_MB", "100"));
  }
}
module.exports = StorageConfig;
