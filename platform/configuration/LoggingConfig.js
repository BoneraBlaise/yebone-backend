class LoggingConfig {
  constructor(env, profile) {
    this.level = env.get("LOG_LEVEL", profile?.logLevel || "info");
    this.serviceName = "guriraline-server";
    this.jsonFormat = env.get("LOG_JSON", "false") === "true";
    this.requestLogging = env.get("LOG_REQUESTS", "true") === "true";
  }
}
module.exports = LoggingConfig;
