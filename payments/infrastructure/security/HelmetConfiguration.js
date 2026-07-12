class HelmetConfiguration {
  constructor(options = {}) {
    this.contentSecurityPolicy = options.contentSecurityPolicy ?? false;
    this.crossOriginEmbedderPolicy = options.crossOriginEmbedderPolicy ?? false;
  }

  build() {
    return {
      contentSecurityPolicy: this.contentSecurityPolicy,
      crossOriginEmbedderPolicy: this.crossOriginEmbedderPolicy,
    };
  }
}

module.exports = HelmetConfiguration;
