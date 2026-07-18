class AIGatewayValidation {
  constructor(config = {}) {
    this.config = config;
  }

  assertChatBody(body = {}) {
    const message = String(body.message || body.input || "").trim();
    if (!message) {
      const error = new Error("message is required");
      error.statusCode = 400;
      throw error;
    }
    if (message.length > this.config.maxMessageLength) {
      const error = new Error(`message exceeds max length (${this.config.maxMessageLength})`);
      error.statusCode = 400;
      throw error;
    }
    return {
      message,
      sessionId: body.sessionId ? String(body.sessionId) : null,
      scope: body.scope ? String(body.scope) : "chat",
      stream: body.stream === true,
    };
  }

  assertSearchBody(body = {}) {
    const query = String(body.query || body.q || body.message || "").trim();
    if (!query) {
      const error = new Error("query is required");
      error.statusCode = 400;
      throw error;
    }
    if (query.length > this.config.maxMessageLength) {
      const error = new Error(`query exceeds max length (${this.config.maxMessageLength})`);
      error.statusCode = 400;
      throw error;
    }
    return {
      query,
      sessionId: body.sessionId ? String(body.sessionId) : null,
      stream: body.stream === true,
    };
  }
}

module.exports = AIGatewayValidation;
