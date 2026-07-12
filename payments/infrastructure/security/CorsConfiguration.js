class CorsConfiguration {
  constructor(options = {}) {
    this.allowedOrigins = options.allowedOrigins || ["*"];
    this.credentials = options.credentials ?? true;
    this.methods = options.methods || ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
  }

  build() {
    return {
      allowedOrigins: this.allowedOrigins,
      credentials: this.credentials,
      methods: this.methods,
    };
  }
}

module.exports = CorsConfiguration;
