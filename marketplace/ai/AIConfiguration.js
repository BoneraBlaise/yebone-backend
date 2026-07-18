/**
 * YEBO AI platform configuration — Phase 7.3 natural language search.
 */
class AIConfiguration {
  constructor(options = {}) {
    this.name = options.name || "Yebone AI Platform";
    this.version = options.version || "7.3.0";
    this.primaryProvider = options.primaryProvider || process.env.AI_PRIMARY_PROVIDER || "mock";
    this.mockProvidersOnly = options.mockProvidersOnly !== false;
    this.maxMessageLength = Number(options.maxMessageLength || process.env.AI_MAX_MESSAGE_LENGTH || 4000);
    this.maxPromptLength = Number(options.maxPromptLength || process.env.AI_MAX_PROMPT_LENGTH || 8000);
    this.requestTimeoutMs = Number(options.requestTimeoutMs || process.env.AI_REQUEST_TIMEOUT_MS || 30000);
    this.streamEnabled = options.streamEnabled !== false;
    this.rateLimitWindowMs = Number(options.rateLimitWindowMs || process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000);
    this.chatRateLimitMax = Number(options.chatRateLimitMax || process.env.AI_CHAT_RATE_LIMIT_MAX || 20);
    this.searchRateLimitMax = Number(options.searchRateLimitMax || process.env.AI_SEARCH_RATE_LIMIT_MAX || 30);
    this.searchDefaultLimit = Number(options.searchDefaultLimit || process.env.AI_SEARCH_DEFAULT_LIMIT || 20);
    this.searchDefaultPage = Number(options.searchDefaultPage || process.env.AI_SEARCH_DEFAULT_PAGE || 1);
    this.enableAuditEvents = options.enableAuditEvents !== false;
    this.enableInjectionGuards = options.enableInjectionGuards !== false;
  }
}

module.exports = AIConfiguration;
