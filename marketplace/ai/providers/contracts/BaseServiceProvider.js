/**
 * Base service provider contract — all typed providers implement this interface.
 * No provider-specific business logic belongs in the router.
 */
class BaseServiceProvider {
  constructor(id, category) {
    this.id = id;
    this.category = category;
    this._initialized = false;
  }

  async initialize() {
    this._initialized = true;
    return { providerId: this.id, category: this.category, initialized: true, mock: true };
  }

  async health() {
    return {
      providerId: this.id,
      category: this.category,
      configured: true,
      healthy: this._initialized,
      mock: true,
      displayBrand: "YEBO AI",
    };
  }

  async execute(_input, _options = {}) {
    throw new Error(`${this.id}: execute() not implemented`);
  }

  async chat(input, options = {}) {
    return this.execute(input, { ...options, mode: "chat" });
  }

  async generatePreview(input, options = {}) {
    return this.execute(input, { ...options, mode: "preview" });
  }
}

module.exports = BaseServiceProvider;
