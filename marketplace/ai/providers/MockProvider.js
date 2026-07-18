const BaseAIProvider = require("./BaseAIProvider");

/**
 * Mock provider — sole active provider in Phase 7.1.
 */
class MockProvider extends BaseAIProvider {
  constructor(config = {}) {
    super("mock", config);
    this.model = config.model || "yebo-mock-v1";
  }

  async initialize() {
    await super.initialize();
    return {
      providerId: this.id,
      initialized: true,
      mock: true,
      model: this.model,
    };
  }

  async chat(input, options = {}) {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    const toolHint = options.toolResults?.length
      ? ` Tool results: ${options.toolResults.length}.`
      : "";
    return {
      providerId: this.id,
      model: this.model,
      mock: true,
      content:
        `YEBO gateway mock response.${toolHint} ` +
        `Your message was received (${text.slice(0, 120)}). ` +
        "Live providers activate in a later milestone.",
      usage: { inputTokens: text.length, outputTokens: 64 },
    };
  }

  async *stream(input, options = {}) {
    const result = await this.chat(input, options);
    const words = result.content.split(" ");
    for (const word of words) {
      yield `${word} `;
    }
  }

  async health() {
    return {
      providerId: this.id,
      configured: true,
      healthy: true,
      mock: true,
      model: this.model,
    };
  }
}

module.exports = MockProvider;
