const LocalStorageAdapter = require("./LocalStorageAdapter");
const CloudinaryAdapterPlaceholder = require("./CloudinaryAdapterPlaceholder");
const StorageRegistry = require("./StorageRegistry");
const UploadService = require("./UploadService");
const DeleteService = require("./DeleteService");
const TransformationService = require("./TransformationService");

class StorageBootstrap {
  static create({ storageConfig } = {}) {
    const registry = new StorageRegistry();
    const providerName = storageConfig?.provider || "local";

    registry.register(
      "local",
      new LocalStorageAdapter({ basePath: storageConfig?.localPath }),
      { type: "local" }
    );
    registry.register(
      "cloudinary",
      new CloudinaryAdapterPlaceholder({
        cloudName: storageConfig?.cloudinaryName,
        apiKey: storageConfig?.cloudinaryApiKey,
        apiSecret: storageConfig?.cloudinaryApiSecret,
      }),
      { type: "cloud", placeholder: true }
    );

    const provider = registry.get(providerName) || registry.get("local");
    const uploadService = new UploadService({
      provider,
      maxUploadSizeMb: storageConfig?.maxUploadSizeMb || 100,
    });
    const deleteService = new DeleteService({ provider });
    const transformationService = new TransformationService({ provider });

    return {
      registry,
      provider,
      providerName,
      uploadService,
      deleteService,
      transformationService,
    };
  }
}

module.exports = StorageBootstrap;
