const BaseServiceProvider = require("./BaseServiceProvider");
const MockProvider = require("../MockProvider");

/**
 * LLM route provider — delegates to legacy MockProvider for planner parity.
 * Preserves tool-aware mock responses while routing through AIRouter.
 */
class RouterLLMProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("llm", "llm");
    this.mock = new MockProvider(config);
    this.model = config.model || "yebo-llm-mock-v1";
  }

  async initialize() {
    await this.mock.initialize();
    return super.initialize();
  }

  async execute(input, options = {}) {
    const result = await this.mock.chat(input, {
      toolResults: options.toolResults || [],
      prompt: options.prompt,
      memory: options.memory || null,
      mode: options.mode || "chat",
    });
    return {
      providerCategory: this.category,
      model: result.model || this.model,
      mock: result.mock !== false,
      content: result.content,
      usage: result.usage,
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = RouterLLMProvider;
