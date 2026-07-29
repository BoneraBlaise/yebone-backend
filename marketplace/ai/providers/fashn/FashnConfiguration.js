/**
 * FASHN configuration — env-driven, never hardcode credentials.
 */
class FashnConfiguration {
  constructor(options = {}) {
    this.apiKey = String(options.apiKey || process.env.FASHN_API_KEY || "").trim();
    this.baseURL = String(
      options.baseURL || process.env.FASHN_BASE_URL || "https://api.fashn.ai"
    )
      .trim()
      .replace(/\/+$/, "");
    this.timeoutMs = Number(options.timeoutMs || process.env.FASHN_TIMEOUT_MS || 120_000);
    this.model = String(options.model || process.env.FASHN_MODEL || "tryon-v1.6").trim();
    this.pollIntervalMs = Number(options.pollIntervalMs || process.env.FASHN_POLL_INTERVAL_MS || 2_000);
  }

  static fromEnv(options = {}) {
    return new FashnConfiguration(options);
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /** Public-facing model alias — never expose provider model names to customers. */
  get publicModelAlias() {
    return "yebo-tryon-v1";
  }
}

module.exports = FashnConfiguration;
