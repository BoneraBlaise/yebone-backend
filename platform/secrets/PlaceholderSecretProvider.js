const SecretProvider = require("./SecretProvider");

class PlaceholderSecretProvider extends SecretProvider {
  constructor({ allowPlaceholders = true } = {}) {
    super();
    this.allowPlaceholders = allowPlaceholders;
    this._store = new Map([
      ["JWT_SECRET_KEY", "your-jwt-secret-placeholder"],
      ["ACTIVATION_SECRET", "your-activation-secret-placeholder"],
      ["CLOUDINARY_API_KEY", "your-cloudinary-api-key-placeholder"],
      ["CLOUDINARY_API_SECRET", "your-cloudinary-api-secret-placeholder"],
      ["STRIPE_SECRET_KEY", "your-stripe-secret-placeholder"],
      ["STRIPE_API_KEY", "your-stripe-publishable-placeholder"],
      ["SMPT_PASSWORD", "your-smtp-password-placeholder"],
      ["POSTGRES_URL", "postgresql://placeholder:placeholder@localhost:5432/guriraline"],
    ]);
  }

  async get(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  }

  async has(key) {
    return this._store.has(key);
  }

  async list() {
    return [...this._store.keys()];
  }
}

module.exports = PlaceholderSecretProvider;
