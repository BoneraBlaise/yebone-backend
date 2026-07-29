const OpenAIConfiguration = require("./openai/OpenAIConfiguration");
const FashnConfiguration = require("./fashn/FashnConfiguration");
const OpenAIProvider = require("./contracts/OpenAIProvider");
const OpenAIVisionProvider = require("./contracts/OpenAIVisionProvider");
const RouterLLMProvider = require("./contracts/RouterLLMProvider");
const FashionProvider = require("./contracts/FashionProvider");
const InteriorProvider = require("./contracts/InteriorProvider");
const InteriorPlacementProvider = require("./contracts/InteriorPlacementProvider");
const VisionProvider = require("./contracts/VisionProvider");

const MOCK_PROVIDER_CLASSES = {
  llm: RouterLLMProvider,
  fashion: FashionProvider,
  interior: InteriorProvider,
  interior_placement: InteriorPlacementProvider,
  vision: VisionProvider,
};

const LIVE_PROVIDER_CLASSES = {
  llm: OpenAIProvider,
  fashion: FashionProvider,
  interior: InteriorProvider,
  interior_placement: InteriorPlacementProvider,
  vision: OpenAIVisionProvider,
};

class AIProviderRegistry {
  constructor(config = {}) {
    this.config = config;
    this.openaiConfig = OpenAIConfiguration.fromEnv(config.openai || config);
    this.fashnConfig = FashnConfiguration.fromEnv(config.fashn || config);
    this.instances = new Map();
    this._initialized = false;
  }

  _providerClasses() {
    return this.openaiConfig.isConfigured() ? LIVE_PROVIDER_CLASSES : MOCK_PROVIDER_CLASSES;
  }

  async initializeAll() {
    const classes = this._providerClasses();
    for (const [id, Cls] of Object.entries(classes)) {
      const instance = new Cls(this.config);
      await instance.initialize();
      this.instances.set(id, instance);
    }
    this._initialized = true;
    return this.list();
  }

  get(providerId) {
    const provider = this.instances.get(providerId);
    if (!provider) {
      throw new Error(`AIProviderRegistry: unknown provider ${providerId}`);
    }
    return provider;
  }

  list() {
    return [...this.instances.entries()].map(([id, provider]) => ({
      id,
      category: provider.category,
      mock: typeof provider.isLive === "boolean" ? !provider.isLive : true,
      configured: provider.isLive === true,
    }));
  }

  getSnapshot() {
    return {
      initialized: this._initialized,
      openaiConfigured: this.openaiConfig.isConfigured(),
      fashnConfigured: this.fashnConfig.isConfigured(),
      providers: this.list(),
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = AIProviderRegistry;
