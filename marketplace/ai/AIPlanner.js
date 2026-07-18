/**
 * AI planner — commerce assistant conversation flow (Phase 7.4).
 */
const SearchParameterExtractor = require("./search/SearchParameterExtractor");
const AIConversationContext = require("./conversation/AIConversationContext");
const ConversationFlowAnalyzer = require("./conversation/ConversationFlowAnalyzer");

class AIPlanner {
  constructor({
    toolRegistry,
    capabilityRegistry,
    promptRegistry,
    providerManager,
    hooks,
    metrics,
    config,
    searchParameterExtractor,
    conversationContext,
    conversationFlowAnalyzer,
  } = {}) {
    this.toolRegistry = toolRegistry;
    this.capabilityRegistry = capabilityRegistry;
    this.promptRegistry = promptRegistry;
    this.providerManager = providerManager;
    this.hooks = hooks;
    this.metrics = metrics;
    this.config = config;
    this.searchParameterExtractor =
      searchParameterExtractor ||
      new SearchParameterExtractor({
        defaultLimit: config?.searchDefaultLimit,
        defaultPage: config?.searchDefaultPage,
      });
    this.conversationContext = conversationContext || new AIConversationContext({
      ttlMs: config?.conversationTtlMs,
      maxSessions: config?.conversationMaxSessions,
    });
    this.conversationFlowAnalyzer =
      conversationFlowAnalyzer ||
      new ConversationFlowAnalyzer({
        searchParameterExtractor: this.searchParameterExtractor,
      });
  }

  _looksLikeProductQuery(text = "") {
    const lower = String(text).toLowerCase();
    const brandHit = SearchParameterExtractor.DEFAULT_BRANDS.some((brand) =>
      lower.includes(brand.toLowerCase())
    );
    if (brandHit) return true;
    const categories = Object.values(SearchParameterExtractor.DEFAULT_CATEGORIES).flat();
    return categories.some((alias) => lower.includes(alias));
  }

  detectIntent({ message, type = "chat", sessionContext = null, flow = null } = {}) {
    const text = String(message || "").toLowerCase();

    if (type === "search") {
      return {
        intent: "search",
        capabilities: ["keyword", "pagination", "filters", "sort"],
        confidence: 0.9,
      };
    }

    if (flow?.intent) {
      return {
        intent: flow.intent,
        capabilities:
          flow.intent === "search"
            ? ["keyword", "pagination", "filters", "sort"]
            : ["faq", "platform_docs"],
        confidence: 0.85,
        followUp: flow.followUp,
      };
    }

    if (sessionContext?.lastIntent === "search" && this.conversationFlowAnalyzer.isFollowUp(message, sessionContext)) {
      return {
        intent: "search",
        capabilities: ["keyword", "filters", "pagination"],
        confidence: 0.8,
        followUp: true,
      };
    }

    if (/show (me )?/.test(text) && this._looksLikeProductQuery(text)) {
      return {
        intent: "search",
        capabilities: ["keyword", "category", "brand", "filters"],
        confidence: 0.85,
      };
    }

    if (text.includes("order") || text.includes("track")) {
      return {
        intent: "order_status",
        capabilities: ["history", "tracking", "order_status"],
        confidence: 0.7,
      };
    }

    if (text.includes("shop") || text.includes("vendor") || text.includes("seller")) {
      return {
        intent: "vendor_lookup",
        capabilities: ["shop_lookup", "seller_lookup", "store_metadata"],
        confidence: 0.65,
      };
    }

    if (text.includes("recommend") || text.includes("suggest")) {
      return {
        intent: "recommend",
        capabilities: ["recommendations", "candidate_composition"],
        confidence: 0.75,
      };
    }

    if (text.includes("pay") || text.includes("checkout")) {
      return {
        intent: "payment",
        capabilities: ["readiness", "payment_availability", "health"],
        confidence: 0.6,
      };
    }

    if (text.includes("product") || text.includes("catalog")) {
      return {
        intent: "catalog",
        capabilities: ["product_lookup", "product_details"],
        confidence: 0.6,
      };
    }

    if (text.includes("ship") || text.includes("delivery")) {
      return {
        intent: "knowledge",
        capabilities: ["shipping", "faq"],
        confidence: 0.6,
      };
    }

    if (text.includes("help") || text.includes("policy") || text.includes("faq")) {
      return {
        intent: "knowledge",
        capabilities: ["faq", "policy", "platform_docs"],
        confidence: 0.55,
      };
    }

    if (text.includes("search") || text.includes("find") || this._looksLikeProductQuery(text)) {
      return {
        intent: "search",
        capabilities: ["keyword", "pagination", "filters"],
        confidence: 0.8,
      };
    }

    if (sessionContext?.lastToolResult) {
      return {
        intent: "commerce_chat",
        capabilities: ["faq", "platform_docs"],
        confidence: 0.55,
        followUp: true,
      };
    }

    return {
      intent: "commerce_chat",
      capabilities: ["faq", "platform_docs"],
      confidence: 0.5,
    };
  }

  buildPromptLayers(intent) {
    const layers = ["system", "safety"];
    if (intent.intent === "search") layers.push("search");
    else layers.push("commerce");
    return layers;
  }

  extractSearchRequest(message, options = {}, sessionContext = null, flow = null) {
    const searchRequest =
      flow?.toolStrategy === "execute" && sessionContext?.lastSearchRequest
        ? this.conversationFlowAnalyzer.buildSearchRequest(message, sessionContext, options)
        : this.searchParameterExtractor.extract(message, options);

    this.metrics.recordSearchExtraction({
      language: searchRequest.language,
      signals: searchRequest.extracted?.signals || [],
      hasBrand: Boolean(searchRequest.brand),
      hasCategory: Boolean(searchRequest.category),
      hasPrice: searchRequest.minPrice !== null || searchRequest.maxPrice !== null,
    });
    return searchRequest;
  }

  buildToolInput(plan, context = {}) {
    const message = context.message || context.query || "";
    const base = {
      query: context.query || message,
      message,
      scope: context.scope,
      capabilities: plan.intent.capabilities || [],
    };

    switch (plan.intent.intent) {
      case "search": {
        const searchRequest = plan.searchRequest;
        return {
          ...base,
          action: "keyword",
          ...searchRequest,
          q: searchRequest.q,
        };
      }
      case "order_status":
        return {
          ...base,
          action: context.orderId ? "tracking" : "history",
          orderId: context.orderId,
        };
      case "vendor_lookup":
        return { ...base, action: "shop_lookup", shopId: context.shopId };
      case "recommend":
        return { ...base, action: "compose" };
      case "payment":
        return { ...base, action: "readiness" };
      case "catalog":
        return { ...base, action: "product_lookup", productId: context.productId };
      default:
        return { ...base, action: "faq", topic: context.scope || "general" };
    }
  }

  _extractProducts(toolResult) {
    const data = toolResult?.data || {};
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.candidates)) {
      return data.candidates.map((entry) => entry.product || entry.searchPreview).filter(Boolean);
    }
    return [];
  }

  async createPlan(request = {}) {
    const { sessionId: resolvedSessionId, context: sessionContext } =
      this.conversationContext.beginTurn(request.sessionId, { userId: request.userId });

    const flow = this.conversationFlowAnalyzer.analyze(request.message, sessionContext);
    const intent = this.detectIntent({
      message: request.message,
      type: request.type,
      sessionContext,
      flow,
    });

    const routing = this.capabilityRegistry.resolveIntent(intent);
    const permission = this.toolRegistry.checkPermission(routing.toolId, {
      userId: request.userId || null,
    });

    let searchRequest = null;
    if (intent.intent === "search" && flow.toolStrategy === "execute") {
      searchRequest = this.extractSearchRequest(
        request.message,
        {
          page: request.page,
          limit: request.limit,
          sort: request.sort,
        },
        sessionContext,
        flow
      );
    }

    const promptLayers = this.buildPromptLayers(intent);
    const prompts = this.promptRegistry.compose(promptLayers, {
      region: request.region || "RW",
      language: request.language || "en",
    });

    const plan = {
      requestId: request.requestId,
      sessionId: resolvedSessionId,
      correlationId: request.requestId,
      intent,
      capabilities: intent.capabilities,
      toolId: routing.toolId,
      routing,
      permission,
      searchRequest,
      conversationFlow: flow,
      toolStrategy: flow.toolStrategy,
      sessionContextSnapshot: this.conversationContext.snapshot(resolvedSessionId),
      reusedToolResult:
        flow.toolStrategy === "reuse" ? sessionContext.lastToolResult || null : null,
      providerId: this.providerManager.activeProviderId,
      promptVersions: prompts.layers,
      prompts,
    };

    this.metrics.recordPlannerDecision({
      requestId: request.requestId,
      intent: intent.intent,
      toolId: routing.toolId,
      capabilities: intent.capabilities,
      allowed: permission.allowed,
    });

    this.metrics.recordConversationTurn({
      sessionId: resolvedSessionId,
      followUp: flow.followUp,
      toolStrategy: flow.toolStrategy,
      turnCount: sessionContext.turnCount,
    });

    return plan;
  }

  async execute(plan, context = {}) {
    await this.hooks.emit("beforeTurn", { plan, context });

    let toolResult = null;
    const toolInput = this.buildToolInput(plan, context);

    if (plan.permission.allowed === false) {
      toolResult = this._failureToolResult(plan, plan.permission.reason || "permission_denied", 403);
      this.metrics.recordToolExecution({
        toolId: plan.toolId,
        success: false,
        latencyMs: 0,
        capabilities: plan.capabilities,
        correlationId: plan.correlationId,
      });
    } else if (plan.toolStrategy === "reuse" && plan.reusedToolResult) {
      toolResult = {
        ...plan.reusedToolResult,
        metadata: {
          ...(plan.reusedToolResult.metadata || {}),
          correlationId: plan.correlationId,
          reused: true,
          toolStrategy: "reuse",
        },
      };
      this.metrics.recordToolReuse({
        toolId: plan.toolId,
        sessionId: plan.sessionId,
        correlationId: plan.correlationId,
      });
    } else {
      try {
        toolResult = await this.toolRegistry.execute(plan.toolId, toolInput, {
          userId: context.userId || null,
          correlationId: plan.correlationId,
        });
        this.metrics.recordToolExecution({
          toolId: plan.toolId,
          success: toolResult.success,
          latencyMs: toolResult.latency || 0,
          capabilities: plan.capabilities,
          correlationId: plan.correlationId,
        });
        await this.hooks.emit("afterTool", { toolId: plan.toolId, toolResult });
      } catch (err) {
        toolResult = this._failureToolResult(
          plan,
          err.code || "tool_execution_failed",
          err.statusCode || 500,
          err.message
        );
        this.metrics.recordToolExecution({
          toolId: plan.toolId,
          success: false,
          latencyMs: 0,
          capabilities: plan.capabilities,
          correlationId: plan.correlationId,
        });
      }
    }

    this.metrics.recordProviderCall({
      providerId: this.providerManager.activeProviderId,
      correlationId: plan.correlationId,
    });

    const providerResult = await this.providerManager.chat(context.message || context.query, {
      toolResults: toolResult ? [toolResult] : [],
      prompt: plan.prompts.instruction,
    });

    const products = this._extractProducts(toolResult);
    this.conversationContext.recordTurn(plan.sessionId, {
      message: context.message || context.query,
      plan,
      toolResult,
      toolStrategy: plan.toolStrategy,
      products,
    });

    const response = this.formatResponse(plan, providerResult, toolResult, products);
    await this.hooks.emit("afterResponse", { plan, response });
    return response;
  }

  _failureToolResult(plan, code, statusCode, message = null) {
    return {
      success: false,
      tool: plan.toolId,
      version: "7.3.0",
      latency: 0,
      data: null,
      metadata: { correlationId: plan.correlationId },
      error: {
        code,
        message: message || `AIToolRegistry: ${code}`,
        statusCode,
      },
    };
  }

  formatResponse(plan, providerResult, toolResult, products = []) {
    return {
      requestId: plan.requestId,
      sessionId: plan.sessionId,
      correlationId: plan.correlationId,
      intent: plan.intent.intent,
      capabilities: plan.capabilities,
      toolId: plan.toolId,
      routing: plan.routing,
      promptVersions: plan.promptVersions,
      provider: {
        id: providerResult.providerId,
        model: providerResult.model,
        mock: providerResult.mock !== false,
      },
      tool: toolResult,
      message: providerResult.content,
      searchRequest: plan.searchRequest || null,
      conversation: {
        turnCount: plan.sessionContextSnapshot?.turnCount || 0,
        followUp: plan.conversationFlow?.followUp || false,
        toolStrategy: plan.toolStrategy,
        flowType: plan.conversationFlow?.type || "new_turn",
        productCount: products.length,
      },
      meta: {
        phase: "7.4",
        gateway: true,
        streamingPrepared: true,
        productionTools: true,
        naturalLanguageSearch: plan.intent.intent === "search",
        commerceAssistant: true,
      },
    };
  }

  async *executeStream(plan, context = {}) {
    const response = await this.execute(plan, context);
    const words = String(response.message || "").split(" ");
    for (const word of words) {
      yield word + " ";
    }
    return response;
  }
}

module.exports = AIPlanner;
