/**
 * OpenAI configuration — env-driven, never hardcode keys.
 */
class OpenAIConfiguration {
  constructor(options = {}) {
    this.apiKey = String(options.apiKey || process.env.OPENAI_API_KEY || "").trim();
    this.model = String(options.model || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
    this.visionModel = String(
      options.visionModel || process.env.OPENAI_VISION_MODEL || this.model
    ).trim();
    this.timeoutMs = Number(options.timeoutMs || process.env.OPENAI_TIMEOUT_MS || 30_000);
    this.maxTokens = Number(options.maxTokens || process.env.OPENAI_MAX_TOKENS || 2048);
    this.baseURL = options.baseURL || process.env.OPENAI_BASE_URL || null;
  }

  static fromEnv(options = {}) {
    return new OpenAIConfiguration(options);
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /** Public-facing model alias — never expose provider model names to customers. */
  get publicModelAlias() {
    return "yebo-ai-v1";
  }

  get visionModelAlias() {
    return "yebo-vision-v1";
  }
}

module.exports = OpenAIConfiguration;
