/**
 * Base AI provider contract — Phase 7.1.
 */
class BaseAIProvider {
  constructor(id, config = {}) {
    this.id = id;
    this.config = config;
    this._initialized = false;
  }

  async initialize() {
    this._initialized = true;
    return { providerId: this.id, initialized: true };
  }

  async chat(_input, _options = {}) {
    throw new Error(`${this.id}: chat() not implemented`);
  }

  async *stream(_input, _options = {}) {
    throw new Error(`${this.id}: stream() not implemented`);
  }

  async health() {
    return {
      providerId: this.id,
      configured: false,
      healthy: this._initialized,
      mock: true,
    };
  }
}

module.exports = BaseAIProvider;
