/**
 * AI gateway — HTTP boundary orchestration (Phase 7.1 + Phase 13 Commerce Agent).
 */
const PlatformAuditAdapter = require("../integration/audit/PlatformAuditAdapter");
const AIAuthContext = require("./auth/AIAuthContext");

class AIGateway {
  constructor(platform) {
    this.platform = platform;
  }

  _audit(event, payload = {}) {
    if (!this.platform.config.enableAuditEvents) return;

    PlatformAuditAdapter.recordRuntime({
      platform: "ai",
      resource: payload.requestId || "ai-gateway",
      action: event,
      actor: payload.userId || "system",
      newValue: {
        intent: payload.intent || null,
        toolId: payload.toolId || null,
        providerId: payload.providerId || this.platform.providerManager.activeProviderId,
      },
      correlationId: payload.requestId || null,
      reason: "runtime_event",
    }).catch(() => {});
  }

  async handleChat(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this.platform.security.createRequestId();
    req.aiRequestId = requestId;

    const parsed = this.platform.validation.assertChatBody(req.body);
    await this.platform.security.assertSafeMessage(parsed.message);

    const authContext = AIAuthContext.fromRequest(req);

    if (parsed.cancelActionId) {
      this.platform.confirmationHandler.cancel({
        cancelActionId: parsed.cancelActionId,
        sessionId: parsed.sessionId,
        authContext,
      });
      const response = this.platform.planner.formatCancellationResponse({
        requestId,
        sessionId: parsed.sessionId,
      });
      return { stream: false, data: response, latencyMs: stopTimer() };
    }

    if (parsed.confirmActionId && parsed.sessionId && parsed.actionChecksum) {
      const { record, toolResult } = await this.platform.confirmationHandler.validateAndExecute({
        confirmActionId: parsed.confirmActionId,
        sessionId: parsed.sessionId,
        actionChecksum: parsed.actionChecksum,
        authContext,
        correlationId: requestId,
      });
      const response = await this.platform.planner.formatConfirmationExecutionResponse({
        requestId,
        sessionId: parsed.sessionId,
        record,
        toolResult,
        message: parsed.message,
        authContext,
      });
      const latencyMs = stopTimer();
      this._audit("ai.chat.confirmation.complete", response);
      return { stream: false, data: response, latencyMs };
    }

    const plan = await this.platform.planner.createPlan({
      requestId,
      sessionId: parsed.sessionId,
      message: parsed.message,
      type: "chat",
      region: req.body.region,
      language: req.body.language,
      userId: authContext.userId,
      vendorId: authContext.vendorId,
      role: authContext.role,
    });

    const context = {
      message: parsed.message,
      sessionId: parsed.sessionId,
      scope: parsed.scope,
      userId: authContext.userId,
      vendorId: authContext.vendorId,
      role: authContext.role,
    };

    if (parsed.stream && this.platform.config.streamEnabled && !plan.requiresConfirmation) {
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

    const authContext = AIAuthContext.fromRequest(req);

    const plan = await this.platform.planner.createPlan({
      requestId,
      sessionId: parsed.sessionId,
      message: parsed.query,
      type: "search",
      page: parsed.page,
      limit: parsed.limit,
      sort: parsed.sort,
      userId: authContext.userId,
      vendorId: authContext.vendorId,
      role: authContext.role,
    });

    const response = await this.platform.planner.execute(plan, {
      message: parsed.query,
      query: parsed.query,
      sessionId: parsed.sessionId,
      userId: authContext.userId,
      vendorId: authContext.vendorId,
      role: authContext.role,
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
        res.write(`data: ${JSON.stringify({ error: err.message, reason: err.reason || null })}\n\n`);
        res.end();
      }
    })();
  }
}

module.exports = AIGateway;
