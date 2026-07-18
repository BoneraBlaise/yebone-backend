/**
 * AI planner — intent detection, NL search extraction, capability routing, tool execution.
 */
const SearchParameterExtractor = require("./search/SearchParameterExtractor");

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
  } = {}) {
    this.toolRegistry = toolRegistry;
    this.capabilityRegistry = capabilityRegistry;
    this.promptRegistry = promptRegistry;
    this.providerManager = providerManager;
    this.hooks = hooks;
    this.metrics = metrics;
    this.config = config;
    this.searchParameterExtractor =
      searchParameterExtractor || new SearchParameterExtractor({
        defaultLimit: config?.searchDefaultLimit,
        defaultPage: config?.searchDefaultPage,
      });
  }

  detectIntent({ message, type = "chat" } = {}) {
    const text = String(message || "").toLowerCase();

    if (type === "search") {
      return {
        intent: "search",
        capabilities: ["keyword", "pagination", "filters", "sort"],
        confidence: 0.9,
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

    if (text.includes("search") || text.includes("find")) {
      return {
        intent: "search",
        capabilities: ["keyword", "pagination", "filters"],
        confidence: 0.8,
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

  extractSearchRequest(message, options = {}) {
    const searchRequest = this.searchParameterExtractor.extract(message, options);
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
        const searchRequest =
          plan.searchRequest ||
          this.extractSearchRequest(message, {
            page: context.page,
            limit: context.limit,
            sort: context.sort,
          });
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

  async createPlan(request = {}) {
    const intent = this.detectIntent(request);
    const routing = this.capabilityRegistry.resolveIntent(intent);
    const permission = this.toolRegistry.checkPermission(routing.toolId, {
      userId: request.userId || null,
    });

    let searchRequest = null;
    if (intent.intent === "search") {
      searchRequest = this.extractSearchRequest(request.message, {
        page: request.page,
        limit: request.limit,
        sort: request.sort,
      });
    }

    const promptLayers = this.buildPromptLayers(intent);
    const prompts = this.promptRegistry.compose(promptLayers, {
      region: request.region || "RW",
      language: request.language || "en",
    });

    const plan = {
      requestId: request.requestId,
      sessionId: request.sessionId || null,
      correlationId: request.requestId,
      intent,
      capabilities: intent.capabilities,
      toolId: routing.toolId,
      routing,
      permission,
      searchRequest,
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

    return plan;
  }

  async execute(plan, context = {}) {
    await this.hooks.emit("beforeTurn", { plan, context });

    const toolInput = this.buildToolInput(plan, context);
    let toolResult = null;

    if (plan.permission.allowed === false) {
      toolResult = {
        success: false,
        tool: plan.toolId,
        version: "7.2.0",
        latency: 0,
        data: null,
        metadata: { correlationId: plan.correlationId },
        error: {
          code: plan.permission.reason || "permission_denied",
          message: `AIToolRegistry: ${plan.permission.reason || "permission_denied"}`,
          statusCode: 403,
        },
      };
      this.metrics.recordToolExecution({
        toolId: plan.toolId,
        success: false,
        latencyMs: 0,
        capabilities: plan.capabilities,
        correlationId: plan.correlationId,
      });
    } else {
      try {
        toolResult = await this.toolRegistry.execute(plan.toolId, toolInput, {
          userId: context.userId || null,
          correlationId: plan.correlationId,
        });
        await this.hooks.emit("afterTool", { toolId: plan.toolId, toolResult });
      } catch (err) {
        toolResult = {
          success: false,
          tool: plan.toolId,
          version: "7.2.0",
          latency: 0,
          data: null,
          metadata: { correlationId: plan.correlationId },
          error: {
            code: err.code || "tool_execution_failed",
            message: err.message,
            statusCode: err.statusCode || 500,
          },
        };
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

    const response = this.formatResponse(plan, providerResult, toolResult);
    await this.hooks.emit("afterResponse", { plan, response });
    return response;
  }

  formatResponse(plan, providerResult, toolResult) {
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
      meta: {
        phase: "7.3",
        gateway: true,
        streamingPrepared: true,
        productionTools: true,
        naturalLanguageSearch: plan.intent.intent === "search",
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
