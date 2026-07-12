class CompressionConfiguration {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.threshold = options.threshold ?? 1024;
  }

  build() {
    return {
      enabled: this.enabled,
      threshold: this.threshold,
    };
  }
}

module.exports = CompressionConfiguration;
