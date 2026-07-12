class SecurityConfig {
  constructor(env) {
    this.jwtSecret = env.get("JWT_SECRET_KEY", "");
    this.jwtExpires = env.get("JWT_EXPIRES", "7d");
    this.activationSecret = env.get("ACTIVATION_SECRET", "");
    this.googleClientId = env.get("GOOGLE_CLIENT_ID", "");
    this.googleClientSecret = env.get("GOOGLE_CLIENT_SECRET", "");
    this.corsOrigins = (env.get("CORS_ORIGINS", "") || "").split(",").filter(Boolean);
    this.rateLimitMax = Number(env.get("RATE_LIMIT_MAX", "100"));
  }
}
module.exports = SecurityConfig;
