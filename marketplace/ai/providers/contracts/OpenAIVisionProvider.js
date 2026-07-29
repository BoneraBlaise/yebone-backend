const BaseServiceProvider = require("./BaseServiceProvider");
const OpenAIConfiguration = require("../openai/OpenAIConfiguration");
const OpenAIClient = require("../openai/OpenAIClient");
const { buildCommercePrompt } = require("../openai/OpenAIPrompts");
const VisionProvider = require("./VisionProvider");

class OpenAIVisionProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("vision", "vision");
    this.openaiConfig = OpenAIConfiguration.fromEnv(config.openai || config);
    this.client = new OpenAIClient(this.openaiConfig);
    this.fallback = new VisionProvider(config);
    this.model = this.openaiConfig.visionModelAlias;
  }

  get isLive() {
    return this.openaiConfig.isConfigured();
  }

  async initialize() {
    await this.fallback.initialize();
    this._initialized = true;
    return { providerId: this.id, category: this.category, initialized: true, mock: !this.isLive, displayBrand: "YEBO AI" };
  }

  async health() {
    return { providerId: this.id, category: this.category, configured: this.isLive, healthy: this._initialized, mock: !this.isLive, displayBrand: "YEBO AI" };
  }

  _parsePayload(input, options = {}) {
    if (options.imageUrl || options.imageBase64 || options.image) {
      return { imageUrl: options.imageUrl || null, imageBase64: options.imageBase64 || options.image || null, mode: options.mode || "image_search" };
    }
    try {
      const parsed = typeof input === "string" ? JSON.parse(input) : input;
      return { imageUrl: parsed.imageUrl || parsed.url || null, imageBase64: parsed.imageBase64 || parsed.image || null, mode: parsed.mode || "image_search" };
    } catch {
      return { imageUrl: null, imageBase64: null, mode: "image_search" };
    }
  }

  async execute(input, options = {}) {
    if (!this.isLive) return this.fallback.execute(input, options);
    const payload = this._parsePayload(input, options);
    if (!payload.imageUrl && !payload.imageBase64) return this.fallback.execute(input, options);

    try {
      const prompt = buildCommercePrompt("image_search");
      const { content, usage, cost } = await this.client.visionAnalysis({ imageUrl: payload.imageUrl, imageBase64: payload.imageBase64, prompt });
      let structured = {};
      try { structured = JSON.parse(content); } catch { structured = { description: content, confidence: 70 }; }

      return {
        providerCategory: this.category,
        model: this.model,
        mock: false,
        status: "completed",
        imageGeneration: false,
        content: structured.description || content,
        analysis: {
          category: structured.category || null,
          attributes: structured.attributes || {},
          colors: structured.colors || [],
          keywords: structured.keywords || [],
          confidence: structured.confidence ?? 75,
          productType: structured.productType || "other",
          description: structured.description || content,
        },
        structured,
        usage,
        cost,
        displayBrand: "YEBO AI",
      };
    } catch (err) {
      return { ...(await this.fallback.execute(input, options)), fallbackUsed: true, fallbackReason: err.message };
    }
  }
}

module.exports = OpenAIVisionProvider;
