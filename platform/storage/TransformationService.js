class TransformationService {
  constructor({ provider } = {}) {
    this.provider = provider;
  }

  async transform(key, options = {}) {
    if (typeof this.provider.transform === "function") {
      return this.provider.transform(key, options);
    }
    return {
      key,
      mode: "placeholder",
      message: "Transformation not supported by current storage provider",
      options,
    };
  }
}

module.exports = TransformationService;
