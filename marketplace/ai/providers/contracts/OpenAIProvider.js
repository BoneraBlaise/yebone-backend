const BaseServiceProvider = require("./BaseServiceProvider");
const OpenAIConfiguration = require("../openai/OpenAIConfiguration");
const OpenAIClient = require("../openai/OpenAIClient");
const {
  buildSystemPrompt,
  buildCommercePrompt,
  formatToolContext,
} = require("../openai/OpenAIPrompts");
const RouterLLMProvider = require("./RouterLLMProvider");

const COMMERCE_MODES = new Set([
  "compare",
  "budget",
  "gift",
  "recommend",
  "recommendations",
  "description",
  "translation",
  "tips",
  "suggestions",
  "intelligence",
]);

/**
 * OpenAI LLM provider — implements BaseServiceProvider contract.
 * All OpenAI SDK usage stays inside this module tree.
 * Falls back to mock RouterLLMProvider when OPENAI_API_KEY is unset.
 */
class OpenAIProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("llm", "llm");
    this.openaiConfig = OpenAIConfiguration.fromEnv(config.openai || config);
    this.client = new OpenAIClient(this.openaiConfig);
    this.fallback = new RouterLLMProvider(config);
    this.model = this.openaiConfig.publicModelAlias;
  }

  get isLive() {
    return this.openaiConfig.isConfigured();
  }

  async initialize() {
    await this.fallback.initialize();
    this._initialized = true;
    return {
      providerId: this.id,
      category: this.category,
      initialized: true,
      mock: !this.isLive,
      configured: this.isLive,
      displayBrand: "YEBO AI",
    };
  }

  async health() {
    return {
      providerId: this.id,
      category: this.category,
      configured: this.isLive,
      healthy: this._initialized,
      mock: !this.isLive,
      displayBrand: "YEBO AI",
    };
  }

  _resolveMode(options = {}) {
    return String(
      options.mode ||
        options.scope ||
        options.serviceType ||
        options.previewType ||
        "chat"
    ).toLowerCase();
  }

  _parseStructured(content) {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async _executeLive(input, options = {}) {
    const mode = this._resolveMode(options);
    const body = options.body || options.payload || {};

    if (COMMERCE_MODES.has(mode)) {
      return this._executeCommerce(mode, body, options);
    }

    return this._executeChat(input, options);
  }

  async _executeCommerce(mode, body, options = {}) {
    const commerceMode =
      mode === "intelligence" ? String(body?.mode || body?.scope || "compare").toLowerCase() : mode;

    const prompt = buildCommercePrompt(commerceMode, body);
    if (!prompt) {
      return this._executeChat(JSON.stringify(body), options);
    }

    const { content, usage, cost } = await this.client.chatCompletion({
      messages: [
        { role: "system", content: buildSystemPrompt(options) },
        { role: "user", content: prompt },
      ],
      responseFormat: "json",
    });

    const structured = this._parseStructured(content);

    return {
      providerCategory: this.category,
      model: this.model,
      mock: false,
      mode: commerceMode,
      content,
      structured: structured || { summary: content, displayBrand: "YEBO AI" },
      usage,
      cost,
      displayBrand: "YEBO AI",
    };
  }

  async _executeChat(input, options = {}) {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    const toolContext = formatToolContext(options.toolResults || []);
    const memoryHint = options.memory?.hit
      ? `\nConversation memory: ${JSON.stringify({
          product: options.memory.resolvedProduct?.name,
          references: options.memory.references,
        })}`
      : "";

    const messages = [
      { role: "system", content: buildSystemPrompt(options) + memoryHint },
      {
        role: "user",
        content: `${text}${toolContext}`,
      },
    ];

    const { content, usage, cost } = await this.client.chatCompletion({ messages });

    return {
      providerCategory: this.category,
      model: this.model,
      mock: false,
      mode: options.mode || "chat",
      content,
      usage,
      cost,
      displayBrand: "YEBO AI",
    };
  }

  async execute(input, options = {}) {
    if (!this.isLive) {
      return this.fallback.execute(input, options);
    }

    try {
      return await this._executeLive(input, options);
    } catch (err) {
      const fallbackResult = await this.fallback.execute(input, options);
      return {
        ...fallbackResult,
        fallbackUsed: true,
        fallbackReason: err.message,
      };
    }
  }
}

module.exports = OpenAIProvider;
