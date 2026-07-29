const BaseServiceProvider = require("./BaseServiceProvider");

class LLMProvider extends BaseServiceProvider {
  constructor(config = {}) {
    super("llm", "llm");
    this.model = config.model || "yebo-llm-mock-v1";
  }

  async execute(input, options = {}) {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    const mode = options.mode || "chat";
    return {
      providerCategory: this.category,
      model: this.model,
      mock: true,
      mode,
      content:
        `YEBO AI response (${mode}). ` +
        `Your request was processed (${text.slice(0, 120)}). ` +
        "Live LLM providers activate in a later milestone.",
      usage: { inputTokens: text.length, outputTokens: 64 },
      displayBrand: "YEBO AI",
    };
  }
}

module.exports = LLMProvider;
