const MockProvider = require("./providers/MockProvider");
const { registerPlaceholderProviders } = require("./providers/registerProviders");

/**
 * LLM provider manager — MockProvider active in Phase 7.1.
 */
class AIProviderManager {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.activeProviderId = config.primaryProvider || "mock";
    this._initialized = false;
  }

  register(id, provider, { active = false } = {}) {
    this.providers.set(id, provider);
    if (active) this.activeProviderId = id;
    return provider;
  }

  initializeAll() {
    const mock = new MockProvider({ model: "yebo-mock-v1" });
    this.register("mock", mock, { active: this.activeProviderId === "mock" });
    registerPlaceholderProviders(this);

    for (const provider of this.providers.values()) {
      provider.initialize();
    }
    this._initialized = true;
    return this.getSnapshot();
  }

  getProvider(id = null) {
    const providerId = id || this.activeProviderId;
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`AIProviderManager: unknown provider ${providerId}`);
    }
    return provider;
  }

  getActiveProvider() {
    return this.getProvider(this.activeProviderId);
  }

  async chat(input, options = {}) {
    const provider = this.getActiveProvider();
    return provider.chat(input, options);
  }

  async *stream(input, options = {}) {
    const provider = this.getActiveProvider();
    if (typeof provider.stream === "function") {
      yield* provider.stream(input, options);
      return;
    }
    const result = await provider.chat(input, options);
    yield result.content || "";
  }

  listProviders() {
    return [...this.providers.keys()].map((id) => ({
      id,
      active: id === this.activeProviderId,
    }));
  }

  async health() {
    const entries = {};
    for (const [id, provider] of this.providers.entries()) {
      entries[id] = await provider.health();
    }
    return {
      activeProvider: this.activeProviderId,
      providers: entries,
      initialized: this._initialized,
    };
  }

  getSnapshot() {
    return {
      activeProvider: this.activeProviderId,
      providers: this.listProviders(),
      initialized: this._initialized,
      mockOnly: this.activeProviderId === "mock",
    };
  }
}

module.exports = AIProviderManager;
