class ApplicationConfig {
  constructor(env) {
    this.port = Number(env.get("PORT", "5000"));
    this.nodeEnv = env.get("NODE_ENV", "development");
    this.backendUrl = env.get("BACKEND_URL", "http://localhost:5000");
    this.frontendUrl = env.get("FRONTEND_URL", "http://localhost:3000");
    this.serviceName = "guriraline-server";
  }
}
module.exports = ApplicationConfig;
