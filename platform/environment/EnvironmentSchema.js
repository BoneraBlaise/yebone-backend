const PLACEHOLDER = "your-placeholder-value";

/**
 * Environment variable schema definitions.
 */
class EnvironmentSchema {
  static create() {
    return new EnvironmentSchema([
      { key: "NODE_ENV", description: "Runtime environment", required: true, defaultValue: "development" },
      { key: "PORT", description: "HTTP server port", required: true, defaultValue: "5000" },
      { key: "DB_URL", description: "MongoDB connection string", required: true, placeholder: PLACEHOLDER },
      { key: "POSTGRES_URL", description: "PostgreSQL connection string (future)", required: false, placeholder: PLACEHOLDER },
      { key: "JWT_SECRET_KEY", description: "JWT signing secret", required: true, placeholder: PLACEHOLDER },
      { key: "JWT_EXPIRES", description: "JWT expiration", required: true, defaultValue: "7d" },
      { key: "ACTIVATION_SECRET", description: "Account activation secret", required: true, placeholder: PLACEHOLDER },
      { key: "GOOGLE_CLIENT_ID", description: "Google OAuth client ID", required: true, placeholder: PLACEHOLDER },
      { key: "GOOGLE_CLIENT_SECRET", description: "Google OAuth client secret", required: true, placeholder: PLACEHOLDER },
      { key: "BACKEND_URL", description: "Public backend URL", required: true, defaultValue: "http://localhost:5000" },
      { key: "FRONTEND_URL", description: "Frontend URL", required: true, defaultValue: "http://localhost:3000" },
      { key: "CLOUDINARY_NAME", description: "Cloudinary cloud name", required: true, placeholder: PLACEHOLDER },
      { key: "CLOUDINARY_API_KEY", description: "Cloudinary API key", required: true, placeholder: PLACEHOLDER },
      { key: "CLOUDINARY_API_SECRET", description: "Cloudinary API secret", required: true, placeholder: PLACEHOLDER },
      { key: "SMPT_HOST", description: "SMTP host", required: false, placeholder: PLACEHOLDER },
      { key: "SMPT_PORT", description: "SMTP port", required: false, defaultValue: "587" },
      { key: "SMPT_SERVICE", description: "SMTP service", required: false, placeholder: PLACEHOLDER },
      { key: "SMPT_MAIL", description: "SMTP sender email", required: false, placeholder: PLACEHOLDER },
      { key: "SMPT_PASSWORD", description: "SMTP password", required: false, placeholder: PLACEHOLDER },
      { key: "STRIPE_SECRET_KEY", description: "Stripe secret key placeholder", required: false, placeholder: PLACEHOLDER },
      { key: "STRIPE_API_KEY", description: "Stripe publishable key placeholder", required: false, placeholder: PLACEHOLDER },
      { key: "LOG_LEVEL", description: "Logging level", required: false, defaultValue: "info" },
    ]);
  }

  constructor(entries = []) {
    this.entries = entries;
    this._byKey = new Map(entries.map((e) => [e.key, e]));
  }

  get(key) {
    return this._byKey.get(key) || null;
  }

  all() {
    return [...this.entries];
  }

  requiredKeys(profile = "production") {
    if (profile === "test" || profile === "development") {
      return this.entries.filter((e) => e.key === "NODE_ENV" || e.key === "PORT").map((e) => e.key);
    }
    return this.entries.filter((e) => e.required).map((e) => e.key);
  }
}

module.exports = EnvironmentSchema;
