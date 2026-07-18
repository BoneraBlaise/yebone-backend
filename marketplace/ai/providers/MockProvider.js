const BaseAIProvider = require("./BaseAIProvider");

/**
 * Mock provider — sole active provider in Phase 7.1+.
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

  _formatMemoryAwareResponse(input, options = {}) {
    const memory = options.memory;
    if (!memory?.hit) return null;

    const text = String(input || "").toLowerCase();
    const productName =
      memory.resolvedProduct?.name ||
      options.toolResults?.[0]?.data?.product?.name ||
      "the product from your conversation";

    if (/warranty|does it have|tell me about it|details about/i.test(text)) {
      const product = options.toolResults?.find(
        (entry) => entry?.success && entry?.data?.product
      )?.data?.product;
      const description = product?.description || "the product listing";
      return `About ${productName} from your current conversation: ${description}. Refer to the vendor listing for warranty details when available.`;
    }

    return null;
  }

  _formatCheckoutExplanation(toolResults = []) {
    const tool = toolResults.find(
      (entry) =>
        entry?.success &&
        (Array.isArray(entry?.data?.guidance) ||
          Array.isArray(entry?.data?.comparisons) ||
          entry?.data?.availability)
    );
    if (!tool) return null;

    const data = tool.data;
    if (data.availability && !data.comparisons?.length) {
      return data.guidance?.[0] || "Availability guidance is based on current catalog stock data.";
    }

    if (Array.isArray(data.comparisons) && data.comparisons.length > 0) {
      const winner = data.comparisons[0];
      const name = winner.preview?.name || winner.product?.name || "the leading option";
      const points = (data.guidance || winner.considerations || []).slice(0, 3).join("; ");
      return `For your purchase decision, ${name} stands out.${points ? ` Why: ${points}.` : ""}`;
    }

    if (Array.isArray(data.guidance) && data.guidance.length > 0) {
      return data.guidance.slice(0, 3).join(" ");
    }

    return null;
  }

  _formatRecommendationExplanation(toolResults = []) {
    const tool = toolResults.find(
      (entry) => entry?.success && Array.isArray(entry?.data?.recommendations) && entry.data.recommendations.length > 0
    );
    if (!tool) return null;

    const top = tool.data.recommendations[0];
    const name = top.searchPreview?.name || top.product?.name || "this product";
    const reasons = (top.reasons || []).slice(0, 3).join("; ");
    const reused = tool.data.meta?.searchReused ? " from your current search results" : "";
    return `I recommend ${name}${reused}.${reasons ? ` Why: ${reasons}.` : ""}`;
  }

  async chat(input, options = {}) {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    const memoryMessage = this._formatMemoryAwareResponse(text, options);
    if (memoryMessage) {
      return {
        providerId: this.id,
        model: this.model,
        mock: true,
        content: memoryMessage,
        usage: { inputTokens: text.length, outputTokens: memoryMessage.length },
      };
    }

    const checkoutMessage = this._formatCheckoutExplanation(options.toolResults || []);
    if (checkoutMessage) {
      return {
        providerId: this.id,
        model: this.model,
        mock: true,
        content: checkoutMessage,
        usage: { inputTokens: text.length, outputTokens: checkoutMessage.length },
      };
    }

    const recommendationMessage = this._formatRecommendationExplanation(options.toolResults || []);
    if (recommendationMessage) {
      return {
        providerId: this.id,
        model: this.model,
        mock: true,
        content: recommendationMessage,
        usage: { inputTokens: text.length, outputTokens: recommendationMessage.length },
      };
    }

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
