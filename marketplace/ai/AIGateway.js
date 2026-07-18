/**
 * AI gateway — HTTP boundary orchestration (Phase 7.1).
 */
class AIGateway {
  constructor(platform) {
    this.platform = platform;
  }

  _audit(event, payload = {}) {
    if (!this.platform.config.enableAuditEvents) return;
    // Structured audit hook — no PII in default logs
    if (process.env.NODE_ENV !== "test") {
      console.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          service: "yebone-ai-gateway",
          event,
          requestId: payload.requestId || null,
          intent: payload.intent || null,
          toolId: payload.toolId || null,
          providerId: payload.providerId || this.platform.providerManager.activeProviderId,
          mock: true,
        })
      );
    }
  }

  async handleChat(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this.platform.security.createRequestId();
    req.aiRequestId = requestId;

    const parsed = this.platform.validation.assertChatBody(req.body);
    await this.platform.security.assertSafeMessage(parsed.message);

    const plan = await this.platform.planner.createPlan({
      requestId,
      sessionId: parsed.sessionId,
      message: parsed.message,
      type: "chat",
      region: req.body.region,
      language: req.body.language,
    });

    const context = {
      message: parsed.message,
      sessionId: parsed.sessionId,
      scope: parsed.scope,
      userId: req.aiContext?.userId || null,
    };

    if (parsed.stream && this.platform.config.streamEnabled) {
      return {
        stream: true,
        requestId,
        iterator: this.platform.planner.executeStream(plan, context),
        plan,
      };
    }

    const response = await this.platform.planner.execute(plan, context);
    const latencyMs = stopTimer();
    this.platform.metrics.recordRequest({
      type: "chat",
      requestId,
      latencyMs,
      success: true,
    });
    this._audit("ai.chat.complete", response);

    return { stream: false, data: response, latencyMs };
  }

  async handleSearch(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this.platform.security.createRequestId();
    req.aiRequestId = requestId;

    const parsed = this.platform.validation.assertSearchBody(req.body);
    await this.platform.security.assertSafeMessage(parsed.query);

    const plan = await this.platform.planner.createPlan({
      requestId,
      sessionId: parsed.sessionId,
      message: parsed.query,
      type: "search",
    });

    const response = await this.platform.planner.execute(plan, {
      message: parsed.query,
      query: parsed.query,
      sessionId: parsed.sessionId,
      userId: req.aiContext?.userId || null,
    });

    const latencyMs = stopTimer();
    this.platform.metrics.recordRequest({
      type: "search",
      requestId,
      latencyMs,
      success: true,
    });
    this._audit("ai.search.complete", response);

    return { data: response, latencyMs };
  }

  writeSseStream(res, iterator) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    (async () => {
      try {
        for await (const chunk of iterator) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    })();
  }
}

module.exports = AIGateway;
