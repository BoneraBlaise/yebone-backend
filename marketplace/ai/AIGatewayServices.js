const crypto = require("crypto");
const { AI_SERVICE } = require("./commerce/CreditPolicy");
const IntelligenceService = require("./services/IntelligenceService");
const { maskForCustomer, maskForVendor } = require("./utils/ProviderMasking");
const { analyticsFromProvider, recordAnalytics } = require("./analytics/AIAnalyticsRecorder");

class AIGatewayServices {
  constructor(platform) {
    this.platform = platform;
  }

  _requestId() {
    return this.platform.security.createRequestId();
  }

  _idempotencyKey(req) {
    return (
      req.headers["x-idempotency-key"] ||
      req.body?.idempotencyKey ||
      null
    );
  }

  async _recordAnalytics(event) {
    return recordAnalytics(this.platform, event);
  }

  _analyticsFromProvider(providerResult = {}, base = {}) {
    return analyticsFromProvider(providerResult, base);
  }

  _intelligenceFallback(mode, body) {
    if (mode === "budget") return IntelligenceService.budgetAdvice(body?.selection || body);
    if (mode === "gift") return IntelligenceService.giftFinder(body?.categoryId || body?.category);
    if (mode === "tips") return { tips: IntelligenceService.getShoppingTips(), displayBrand: "YEBO AI" };
    if (mode === "suggestions") return { suggestions: IntelligenceService.getProactiveSuggestions(), displayBrand: "YEBO AI" };
    if (mode === "recommend" || mode === "recommendations") {
      return { type: "recommendations", summary: "YEBO AI recommendations", recommendations: [], displayBrand: "YEBO AI" };
    }
    return IntelligenceService.compareProducts(body?.products || []);
  }

  async handleIntelligence(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this._requestId();
    req.aiRequestId = requestId;

    const body = req.body || {};
    const mode = String(body.mode || body.scope || "compare").toLowerCase();
    const routing = this.platform.router.route({
      serviceType: AI_SERVICE.INTELLIGENCE,
      scope: mode,
      input: JSON.stringify(body),
      options: { mode, scope: mode, body, serviceType: AI_SERVICE.INTELLIGENCE },
    });

    let providerResult = null;
    let result = null;

    try {
      providerResult = await this.platform.router.execute(routing);
      if (providerResult?.structured) {
        result = providerResult.structured;
      } else if (providerResult?.content && !providerResult.mock) {
        try {
          result = JSON.parse(providerResult.content);
        } catch {
          result = { summary: providerResult.content, displayBrand: "YEBO AI" };
        }
      }
    } catch {
      providerResult = null;
    }

    if (!result || providerResult?.mock) {
      result = this._intelligenceFallback(mode, body);
    }

    const latencyMs = stopTimer();

    await this._recordAnalytics(
      this._analyticsFromProvider(providerResult, {
        type: "intelligence",
        requestId,
        latencyMs,
        success: true,
        serviceType: AI_SERVICE.INTELLIGENCE,
        userId: req.aiContext?.userId,
        providerCategory: routing.category,
      })
    );

    return {
      data: maskForCustomer({
        requestId,
        mode,
        result,
        yeboAI: providerResult ? { brand: "YEBO AI" } : undefined,
        type: "intelligence",
      }),
      latencyMs,
    };
  }

  _formatPreviewSession(session = {}) {
    const result = session.result || {};
    const previewImageUrl = result.previewImageUrl || result.output?.[0] || null;
    return {
      sessionId: session.sessionId,
      ai_preview_type: session.previewType,
      productId: session.productId,
      vendorId: session.vendorId,
      status: session.status,
      progress: session.progress,
      imageGeneration: session.imageGeneration === true,
      previewImageUrl: previewImageUrl || null,
      orchestratedAt: session.createdAt,
      completedAt: session.status === "completed" ? session.updatedAt || session.createdAt : null,
      displayBrand: "YEBO AI",
    };
  }

  async handlePreview(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this._requestId();
    req.aiRequestId = requestId;

    const previewType = String(req.body?.ai_preview_type || req.body?.previewType || "");
    const productId = req.body?.productId || null;
    const requestedVendorId =
      req.body?.vendorId ||
      req.aiContext?.vendorId ||
      req.seller?._id?.toString() ||
      null;
    const customerId =
      req.body?.customerId ||
      req.aiContext?.userId ||
      null;
    const idempotencyKey = this._idempotencyKey(req);
    const inputs = req.body?.inputs || {};

    const validation = await this.platform.previewValidation.validatePreviewRequest({
      productId,
      vendorId: requestedVendorId,
      previewType,
    });

    if (!validation.ok) {
      const err = new Error(validation.message);
      err.statusCode = validation.statusCode || 400;
      err.code = validation.code;
      err.publicPayload = maskForCustomer({
        success: false,
        code: validation.code,
        message: validation.message,
        requestId,
      });
      throw err;
    }

    const vendorId = validation.vendorId;
    let providerResultForAnalytics = null;

    const execution = await this.platform.entitlements.executeWithCredits(vendorId, {
      serviceType: AI_SERVICE.PREVIEW,
      previewType,
      idempotencyKey,
      requestId,
      metadata: { productId, customerId },
      executeFn: async () => {
        const sessionId = crypto.randomUUID();
        const routing = this.platform.router.route({
          serviceType: AI_SERVICE.PREVIEW,
          previewType,
          input: JSON.stringify({
            productId,
            productImageUrl: validation.productImageUrl,
            inputs,
          }),
          options: {
            previewType,
            productId,
            productImageUrl: validation.productImageUrl,
            inputs,
          },
        });

        await this.platform.previewSessions.create({
          sessionId,
          requestId,
          previewType,
          productId: validation.productId,
          vendorId,
          customerId,
          status: "processing",
          progress: 5,
          imageGeneration: true,
          result: null,
          creditsConsumed: 0,
          metadata: {
            productName: validation.productName,
            inputs: { hasPersonPhoto: Boolean(inputs.personImage || inputs.userPhoto) },
          },
        });

        let providerResult;
        try {
          providerResult = await this.platform.router.execute(routing);
        } catch (providerErr) {
          await this.platform.previewSessions
            .updateStatus(sessionId, {
              status: "failed",
              progress: 0,
              metadata: {
                productName: validation.productName,
                errorCode: providerErr.code || "PROVIDER_FAILURE",
              },
            })
            .catch(() => {});
          throw providerErr;
        }
        providerResultForAnalytics = providerResult;

        const sessionStatus = providerResult.status || (providerResult.mock ? "completed" : "completed");
        const session = {
          sessionId,
          requestId,
          ai_preview_type: previewType,
          previewType,
          productId: validation.productId,
          vendorId,
          customerId,
          status: sessionStatus,
          progress: providerResult.progress ?? (sessionStatus === "completed" ? 100 : 50),
          imageGeneration: providerResult.imageGeneration === true,
          orchestratedAt: new Date().toISOString(),
          result: providerResult,
          displayBrand: "YEBO AI",
          metadata: {
            productName: validation.productName,
            generationDurationMs: providerResult.generationDurationMs || 0,
          },
        };

        await this.platform.previewSessions.updateStatus(sessionId, {
          status: session.status,
          progress: session.progress,
          result: providerResult,
          metadata: session.metadata,
        });

        return session;
      },
    });

    const latencyMs = stopTimer();

    if (!execution.ok) {
      await this._recordAnalytics({
        type: "preview",
        requestId,
        latencyMs,
        success: false,
        serviceType: AI_SERVICE.PREVIEW,
        vendorId,
        customerId,
        providerCategory: "fashion",
      });
      const err = new Error(execution.message || "Preview request failed");
      err.statusCode = execution.code === "INSUFFICIENT_CREDITS" ? 402 : 403;
      err.code = execution.code;
      err.publicPayload = maskForVendor({ ...execution, requestId });
      throw err;
    }

    if (execution.creditsConsumed) {
      await this.platform.previewSessions.updateStatus(execution.result.sessionId, {
        creditsConsumed: execution.creditsConsumed,
      }).catch(() => {});
    }

    await this._recordAnalytics(
      this._analyticsFromProvider(providerResultForAnalytics || execution.result?.result || {}, {
        type: "preview",
        requestId,
        latencyMs,
        success: true,
        serviceType: previewType || AI_SERVICE.PREVIEW,
        vendorId,
        customerId,
        creditsUsed: execution.creditsConsumed || 0,
        providerCategory: "fashion",
        generationDurationMs: providerResultForAnalytics?.generationDurationMs || 0,
      })
    );

    return {
      data: maskForCustomer({
        requestId,
        session: this._formatPreviewSession({
          ...execution.result,
          creditsConsumed: execution.creditsConsumed || 0,
        }),
        creditsConsumed: execution.creditsConsumed || 0,
        wallet: execution.wallet,
        duplicate: execution.duplicate || false,
        type: "preview",
      }),
      latencyMs,
    };
  }

  async getPreviewSession(sessionId) {
    const session = await this.platform.previewSessions.getBySessionId(sessionId);
    if (!session) return null;
    return maskForCustomer({ session: this._formatPreviewSession(session), type: "preview_status" });
  }

  async getPreviewResult(sessionId) {
    const session = await this.platform.previewSessions.getBySessionId(sessionId);
    if (!session) return null;
    if (session.status !== "completed") {
      return maskForCustomer({
        session: this._formatPreviewSession(session),
        type: "preview_result",
        ready: false,
      });
    }
    return maskForCustomer({
      session: this._formatPreviewSession(session),
      type: "preview_result",
      ready: true,
    });
  }

  async cancelPreview(sessionId, { userId = null } = {}) {
    const session = await this.platform.previewSessions.getBySessionId(sessionId);
    if (!session) {
      const err = new Error("Preview session not found");
      err.statusCode = 404;
      err.code = "SESSION_NOT_FOUND";
      throw err;
    }

    if (userId && session.customerId && String(session.customerId) !== String(userId)) {
      const err = new Error("Not authorized to cancel this preview session");
      err.statusCode = 403;
      err.code = "FORBIDDEN";
      throw err;
    }

    if (["completed", "failed", "expired"].includes(session.status)) {
      return maskForCustomer({
        session: this._formatPreviewSession(session),
        cancelled: false,
        type: "preview_cancel",
      });
    }

    const updated = await this.platform.previewSessions.updateStatus(sessionId, {
      status: "failed",
      progress: 0,
      metadata: {
        ...(session.metadata || {}),
        cancelled: true,
        cancelledAt: new Date().toISOString(),
      },
    });

    return maskForCustomer({
      session: this._formatPreviewSession(updated || session),
      cancelled: true,
      type: "preview_cancel",
    });
  }

  async handleService(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this._requestId();
    req.aiRequestId = requestId;

    const serviceType = String(req.body?.serviceType || req.body?.service || "description");
    const vendorId =
      req.body?.vendorId ||
      req.aiContext?.vendorId ||
      req.seller?._id?.toString() ||
      null;
    const idempotencyKey = this._idempotencyKey(req);
    const input = String(req.body?.input || req.body?.message || "");

    const execution = await this.platform.entitlements.executeWithCredits(vendorId, {
      serviceType,
      idempotencyKey,
      requestId,
      executeFn: async () => {
        const routing = this.platform.router.route({
          serviceType,
          input,
          options: { serviceType, scope: serviceType, body: req.body || {}, input, ...(req.body?.options || {}) },
        });
        return this.platform.router.execute(routing);
      },
    });

    const latencyMs = stopTimer();

    if (!execution.ok) {
      const err = new Error(execution.message || "Service request failed");
      err.statusCode = execution.code === "INSUFFICIENT_CREDITS" ? 402 : 403;
      err.code = execution.code;
      err.publicPayload = maskForVendor({ ...execution, requestId });
      throw err;
    }

    const providerResult = execution.result || {};
    const structured = providerResult.structured || null;

    await this._recordAnalytics(
      this._analyticsFromProvider(providerResult, {
        type: "service",
        requestId,
        latencyMs,
        success: true,
        serviceType,
        vendorId,
        creditsUsed: execution.creditsConsumed || 0,
        providerCategory: providerResult.providerCategory || "llm",
      })
    );

    return {
      data: maskForCustomer({
        requestId,
        serviceType,
        result: structured || providerResult,
        creditsConsumed: execution.creditsConsumed || 0,
        type: "service",
      }),
      latencyMs,
    };
  }

  async handleImageSearch(req) {
    const stopTimer = this.platform.metrics.startTimer();
    const requestId = this._requestId();
    req.aiRequestId = requestId;

    const imageUrl = req.body?.imageUrl || req.body?.url || null;
    const imageBase64 = req.body?.image || req.body?.imageBase64 || req.body?.base64 || null;
    const vendorId = req.body?.vendorId || req.aiContext?.vendorId || null;

    if (!imageUrl && !imageBase64) {
      const err = new Error("image or imageUrl is required for YEBO AI image search");
      err.statusCode = 400;
      err.code = "IMAGE_REQUIRED";
      throw err;
    }

    const runVision = async () => {
      const routing = this.platform.router.route({
        serviceType: AI_SERVICE.IMAGE_SEARCH,
        scope: "image_search",
        input: JSON.stringify({ imageUrl, imageBase64 }),
        options: { mode: "image_search", imageUrl, imageBase64, scope: "image_search" },
      });
      return this.platform.router.execute(routing);
    };

    let providerResult;
    if (vendorId) {
      const execution = await this.platform.entitlements.executeWithCredits(vendorId, {
        serviceType: AI_SERVICE.IMAGE_SEARCH,
        requestId,
        executeFn: runVision,
      });
      if (!execution.ok) {
        const err = new Error(execution.message || "Image search failed");
        err.statusCode = execution.code === "INSUFFICIENT_CREDITS" ? 402 : 403;
        err.code = execution.code;
        err.publicPayload = maskForVendor({ ...execution, requestId });
        throw err;
      }
      providerResult = execution.result;
    } else {
      providerResult = await runVision();
    }

    const analysis = providerResult?.analysis || providerResult?.structured || {};
    const keywords = analysis.keywords || [];
    const searchQuery = keywords.slice(0, 5).join(" ") || analysis.description || analysis.category || "";

    let products = [];
    try {
      const searchTool = this.platform.toolRegistry.tools.get("search.products");
      if (searchTool && searchQuery) {
        const searchResult = await searchTool.execute({ q: searchQuery, limit: 12 }, { userId: req.aiContext?.userId });
        products = searchResult?.products || searchResult?.data?.products || [];
      }
    } catch {
      products = [];
    }

    const latencyMs = stopTimer();

    await this._recordAnalytics(
      this._analyticsFromProvider(providerResult, {
        type: "image_search",
        requestId,
        latencyMs,
        success: true,
        serviceType: AI_SERVICE.IMAGE_SEARCH,
        userId: req.aiContext?.userId,
        vendorId,
        providerCategory: "vision",
      })
    );

    return {
      data: maskForCustomer({
        requestId,
        type: "image_search",
        products,
        confidence: analysis.confidence ?? null,
        attributes: analysis.attributes || {},
        colors: analysis.colors || [],
        category: analysis.category || null,
        productType: analysis.productType || null,
        summary: analysis.description || providerResult?.content || null,
        displayBrand: "YEBO AI",
      }),
      latencyMs,
    };
  }

  async handleVendorDashboard(req) {
    const vendorId = req.seller?._id?.toString() || req.aiContext?.vendorId;
    if (!vendorId) {
      const err = new Error("Vendor authentication required");
      err.statusCode = 403;
      throw err;
    }

    const sub = await this.platform.entitlements.subscriptions.ensureSubscription(vendorId);
    const wallet = await this.platform.entitlements.credits.getWalletSnapshot(vendorId);
    const history = await this.platform.entitlements.credits.getTransactionHistory(vendorId, 20);
    const runtimeMetrics = this.platform.metrics.getSnapshot();

    return maskForVendor({
      subscription: this.platform.entitlements.subscriptions.toPublicDTO(sub),
      credits: wallet,
      usage: {
        previewRequests: runtimeMetrics.searchRequests + runtimeMetrics.chatRequests,
        completedSessions: history.filter((t) => t.type === "consumption").length,
        creditsConsumed: wallet.consumedCredits,
        conversionRate: 0,
        revenueGenerated: 0,
      },
      recommendations: [
        { message: "Enable virtual try-on on fashion listings to increase engagement." },
        { message: "Use YEBO AI product descriptions to improve conversion." },
      ],
      history: history.map((tx) => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        serviceType: tx.serviceType,
        createdAt: tx.createdAt,
      })),
      displayBrand: "YEBO AI",
    });
  }
}

module.exports = AIGatewayServices;
