/**
 * AI planner — commerce assistant through conversation memory (Phase 7.7).
 */
const SearchParameterExtractor = require("./search/SearchParameterExtractor");
const AIConversationContext = require("./conversation/AIConversationContext");
const ConversationFlowAnalyzer = require("./conversation/ConversationFlowAnalyzer");
const ConversationMemoryEngine = require("./conversation/ConversationMemoryEngine");

const WRITE_INTENTS = new Set(["property_listing_create", "property_listing_publish"]);
const WRITE_TOOL_ID = "property.listing.manage";

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
    conversationMemoryEngine,
    pendingActionService,
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
    this.conversationMemoryEngine = conversationMemoryEngine || new ConversationMemoryEngine();
    this.conversationFlowAnalyzer =
      conversationFlowAnalyzer ||
      new ConversationFlowAnalyzer({
        searchParameterExtractor: this.searchParameterExtractor,
        conversationMemoryEngine: this.conversationMemoryEngine,
      });
    this.pendingActionService = pendingActionService || null;
  }

  isWriteIntent(intentName) {
    return WRITE_INTENTS.has(intentName);
  }

  _extractListingCategory(text = "") {
    const lower = String(text).toLowerCase();
    if (lower.includes("car") || lower.includes("vehicle")) return "cars";
    if (lower.includes("house")) return "houses";
    if (lower.includes("land") || lower.includes("plot")) return "land";
    if (lower.includes("commercial")) return "commercial_property";
    return "apartments";
  }

  _buildListingPayload(message = "", sessionContext = {}) {
    const text = String(message);
    const priceMatch = text.match(/(\d[\d,]*)\s*(rwf|frw)?/i);
    const cityMatch = text.match(/in\s+([a-zA-Z\s]+)/i);
    const listingId =
      sessionContext.currentListingId ||
      sessionContext.lastToolResult?.data?.listing?.listingId ||
      null;

    return {
      category: this._extractListingCategory(text),
      title: text.slice(0, 80) || "Draft Listing",
      description: text,
      price: priceMatch ? Number(String(priceMatch[1]).replace(/,/g, "")) : 0,
      city: cityMatch ? cityMatch[1].trim() : "",
      location: { city: cityMatch ? cityMatch[1].trim() : "" },
      listingId,
    };
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
      let capabilities = ["faq", "platform_docs"];
      if (flow.intent === "search") {
        capabilities = ["keyword", "pagination", "filters", "sort"];
      } else if (flow.intent === "recommend") {
        capabilities = ["recommendations", "candidate_composition"];
      } else if (flow.intent === "checkout") {
        capabilities = ["checkout_guidance", "product_comparison", "purchase_readiness"];
      } else if (flow.intent === "catalog") {
        capabilities = ["product_lookup", "product_details"];
      }
      return {
        intent: flow.intent,
        capabilities,
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

    if (this.conversationFlowAnalyzer.isCheckoutRequest(message)) {
      return {
        intent: "checkout",
        capabilities: ["checkout_guidance", "product_comparison", "purchase_readiness"],
        confidence: 0.82,
      };
    }

    if (text.includes("recommend") || text.includes("suggest")) {
      return {
        intent: "recommend",
        capabilities: ["recommendations", "candidate_composition"],
        confidence: 0.75,
      };
    }

    if (
      /best option|what do you recommend|what would you recommend/i.test(
        text
      )
    ) {
      return {
        intent: "recommend",
        capabilities: ["recommendations", "candidate_composition"],
        confidence: 0.8,
      };
    }

    if (
      /should i buy|is it worth|can i buy|can i purchase|compare these|better value|cheaper overall|currently available|purchase now/i.test(
        text
      )
    ) {
      return {
        intent: "checkout",
        capabilities: ["checkout_guidance", "product_comparison", "purchase_readiness"],
        confidence: 0.8,
      };
    }

    if (/\bpay\b|\bpayment\b|\bcheckout payment\b/i.test(text)) {
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

    if (/publish (my )?listing|submit listing|publish property/i.test(text)) {
      return {
        intent: "property_listing_publish",
        capabilities: ["property_listing_publish"],
        confidence: 0.85,
        write: true,
      };
    }

    if (/create (a )?listing|list my (property|apartment|house|car)|new listing/i.test(text)) {
      return {
        intent: "property_listing_create",
        capabilities: ["property_listing_create"],
        confidence: 0.85,
        write: true,
      };
    }

    if (
      text.includes("inventory") ||
      text.includes("stock") ||
      text.includes("low stock") ||
      text.includes("out of stock")
    ) {
      return {
        intent: "seller_inventory",
        capabilities: ["seller_inventory_snapshot", "inventory_health"],
        confidence: 0.8,
      };
    }

    if (
      text.includes("campaign") ||
      text.includes("flash sale") ||
      text.includes("best deal") ||
      text.includes("promotion deal")
    ) {
      return {
        intent: "growth_recommend",
        capabilities: ["growth_recommendations", "campaign_recommendations"],
        confidence: 0.75,
      };
    }

    if (
      text.includes("apartment") ||
      text.includes("house") ||
      text.includes(" land") ||
      text.includes("property listing") ||
      (text.includes("car") && (text.includes("find") || text.includes("search")))
    ) {
      return {
        intent: "property_search",
        capabilities: ["property_search", "vehicle_search", "location_filter", "price_filter"],
        confidence: 0.78,
      };
    }

    if (text.includes("listing details") || text.includes("property details")) {
      return {
        intent: "property_listing_details",
        capabilities: ["property_listing_details", "listing_lookup"],
        confidence: 0.7,
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
    const memory = plan.memoryResolution || context.memoryResolution || {};
    const sessionContext = context.sessionContext || {};
    const resolvedProducts =
      memory.resolvedProducts?.length > 0
        ? memory.resolvedProducts
        : memory.resolvedProduct
          ? [memory.resolvedProduct]
          : sessionContext.currentProducts || [];
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
      case "recommend": {
        return {
          ...base,
          action: "rank",
          sourceProducts: context.sourceProducts || resolvedProducts,
          searchRequest: context.lastSearchRequest || sessionContext.lastSearchRequest || null,
          preferAffordable: /\baffordable\b|\bcheaper\b|\bbudget\b/i.test(message),
          limit: context.limit || 5,
        };
      }
      case "checkout": {
        return {
          ...base,
          action: "guide",
          sourceProducts: context.sourceProducts || resolvedProducts,
          productId:
            context.productId ||
            memory.resolvedProduct?._id ||
            memory.resolvedProduct?.id ||
            sessionContext.currentProduct?._id ||
            null,
          mode: context.mode || plan.conversationFlow?.memoryMode || null,
        };
      }
      case "payment":
        return { ...base, action: "readiness" };
      case "catalog":
        return {
          ...base,
          action: "product_details",
          productId:
            context.productId ||
            memory.resolvedProduct?._id ||
            memory.resolvedProduct?.id ||
            sessionContext.currentProduct?._id ||
            sessionContext.currentProduct?.id ||
            null,
        };
      case "property_search":
        return {
          ...base,
          action: "search",
          q: message,
          message,
          location: /in\s+([a-zA-Z\s]+)/i.exec(message)?.[1]?.trim(),
        };
      case "property_listing_details":
        return {
          ...base,
          listingId:
            context.listingId ||
            memory.resolvedProduct?.listingId ||
            sessionContext.currentListingId ||
            null,
        };
      case "growth_recommend":
        return { ...base, action: "recommend", limit: context.limit || 5 };
      case "seller_inventory":
        return {
          ...base,
          action: "list",
          lowStockOnly: /low stock|out of stock/i.test(message),
        };
      case "property_listing_create": {
        const payload = this._buildListingPayload(message, sessionContext);
        return { ...base, action: "create_draft", ...payload };
      }
      case "property_listing_publish": {
        const payload = this._buildListingPayload(message, sessionContext);
        return { ...base, action: "publish", listingId: payload.listingId };
      }
      default:
        return { ...base, action: "faq", topic: context.scope || "general" };
    }
  }

  _extractProducts(toolResult) {
    const data = toolResult?.data || {};
    if (Array.isArray(data.comparisons) && data.comparisons.length > 0) {
      return data.comparisons.map((entry) => entry.product || entry.preview).filter(Boolean);
    }
    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      return data.recommendations
        .map((entry) => entry.product || entry.searchPreview)
        .filter(Boolean);
    }
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.candidates)) {
      return data.candidates.map((entry) => entry.product || entry.searchPreview).filter(Boolean);
    }
    return [];
  }

  _extractRecommendations(toolResult) {
    const recommendations = toolResult?.data?.recommendations;
    return Array.isArray(recommendations) ? recommendations : [];
  }

  _extractCheckoutGuidance(toolResult) {
    const data = toolResult?.data || {};
    return {
      guidance: Array.isArray(data.guidance) ? data.guidance : [],
      comparisons: Array.isArray(data.comparisons) ? data.comparisons : [],
      availability: data.availability || null,
    };
  }

  async createPlan(request = {}) {
    const { sessionId: resolvedSessionId, context: sessionContext } =
      this.conversationContext.beginTurn(request.sessionId, { userId: request.userId });

    const memoryResolution = this.conversationMemoryEngine.resolve(
      request.message,
      sessionContext
    );
    if (memoryResolution.hit && memoryResolution.resolvedProduct) {
      this.conversationContext.update(resolvedSessionId, {
        currentProduct: memoryResolution.resolvedProduct,
      });
    }
    if (memoryResolution.hit && memoryResolution.resolvedProducts.length > 0) {
      this.conversationContext.update(resolvedSessionId, {
        currentProducts: memoryResolution.resolvedProducts,
      });
    }

    const activeContext = this.conversationContext.get(resolvedSessionId);
    const flow = this.conversationFlowAnalyzer.analyze(request.message, activeContext);
    const intent = this.detectIntent({
      message: request.message,
      type: request.type,
      sessionContext: activeContext,
      flow,
    });

    const routing = this.capabilityRegistry.resolveIntent(intent);
    const permission = this.toolRegistry.checkPermission(routing.toolId, {
      userId: request.userId || null,
      vendorId: request.vendorId || null,
      role: request.role || null,
    });
    const requiresConfirmation = this.isWriteIntent(intent.intent);

    let searchRequest = null;
    if (intent.intent === "search" && flow.toolStrategy === "execute") {
      searchRequest = this.extractSearchRequest(
        request.message,
        {
          page: request.page,
          limit: request.limit,
          sort: request.sort,
        },
        activeContext,
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
      requiresConfirmation,
      searchRequest,
      conversationFlow: flow,
      memoryResolution,
      toolStrategy: flow.toolStrategy,
      sessionContextSnapshot: this.conversationContext.snapshot(resolvedSessionId),
      reusedToolResult:
        flow.toolStrategy === "reuse" ? activeContext.lastToolResult || null : null,
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
      turnCount: activeContext.turnCount,
    });

    this.metrics.recordMemoryResolution({
      sessionId: resolvedSessionId,
      hit: memoryResolution.hit,
      miss: memoryResolution.miss,
      references: memoryResolution.references,
      depth: activeContext.turnCount,
      correlationId: request.requestId,
    });

    if (intent.intent === "recommend") {
      this.metrics.recordRecommendationRequest({
        sessionId: resolvedSessionId,
        reused: Boolean(flow.reuseSearchResults),
        correlationId: request.requestId,
      });
    }

    if (intent.intent === "checkout") {
      this.metrics.recordCheckoutRequest({
        sessionId: resolvedSessionId,
        reused: Boolean(flow.reuseToolResults),
        comparison: /compare|cheaper|better value|which is better/i.test(String(request.message || "")),
        correlationId: request.requestId,
      });
    }

    return plan;
  }

  async execute(plan, context = {}) {
    await this.hooks.emit("beforeTurn", { plan, context });

    const sessionContext = this.conversationContext.get(plan.sessionId);
    const toolInput = this.buildToolInput(plan, {
      ...context,
      sessionContext,
      memoryResolution: plan.memoryResolution,
      sourceProducts:
        plan.memoryResolution?.resolvedProducts?.length > 0
          ? plan.memoryResolution.resolvedProducts
          : plan.memoryResolution?.resolvedProduct
            ? [plan.memoryResolution.resolvedProduct]
            : sessionContext.currentProducts,
      lastSearchRequest: sessionContext.lastSearchRequest,
      productId:
        plan.memoryResolution?.resolvedProduct?._id ||
        plan.memoryResolution?.resolvedProduct?.id ||
        sessionContext.currentProduct?._id ||
        null,
      mode: plan.conversationFlow?.memoryMode || null,
    });

    if (plan.requiresConfirmation) {
      if (plan.permission.allowed === false) {
        return this.formatErrorResponse(plan, plan.permission.reason || "permission_denied", 403);
      }
      if (!this.pendingActionService) {
        return this.formatErrorResponse(plan, "confirmation_unavailable", 500);
      }

      const action = toolInput.action;
      const summary =
        action === "publish"
          ? `Publish property listing${toolInput.listingId ? ` ${toolInput.listingId}` : ""} for review`
          : `Create draft property listing: ${toolInput.title || "Untitled"} (${toolInput.category || "apartments"})`;

      const pendingAction = this.pendingActionService.create({
        sessionId: plan.sessionId,
        requestedBy: context.userId || context.vendorId,
        vendorId: context.vendorId || null,
        toolId: WRITE_TOOL_ID,
        action,
        intent: plan.intent.intent,
        payload: toolInput,
        summary,
        correlationId: plan.correlationId,
      });

      return this.formatConfirmationRequiredResponse(plan, pendingAction, summary);
    }

    let toolResult = null;

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
          vendorId: context.vendorId || null,
          role: context.role || null,
          correlationId: plan.correlationId,
          sessionContext,
          message: context.message || context.query,
        });
        this.metrics.recordToolExecution({
          toolId: plan.toolId,
          success: toolResult.success,
          latencyMs: toolResult.latency || 0,
          capabilities: plan.capabilities,
          correlationId: plan.correlationId,
        });
        if (plan.intent.intent === "recommend" && toolResult.success) {
          const recommendations = this._extractRecommendations(toolResult);
          const reasonSamples = recommendations.flatMap((entry) => entry.reasons || []).slice(0, 5);
          this.metrics.recordRecommendationGeneration({
            count: recommendations.length,
            latencyMs: toolResult.latency || 0,
            reused: Boolean(toolResult.data?.meta?.searchReused),
            reasons: reasonSamples,
            correlationId: plan.correlationId,
          });
        }
        if (plan.intent.intent === "checkout" && toolResult.success) {
          const checkout = this._extractCheckoutGuidance(toolResult);
          this.metrics.recordCheckoutGeneration({
            comparisonCount: checkout.comparisons.length,
            latencyMs: toolResult.latency || 0,
            reused: Boolean(toolResult.data?.meta?.sourceReused),
            guidance: checkout.guidance.slice(0, 5),
            correlationId: plan.correlationId,
          });
        }
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
      memory: plan.memoryResolution || null,
    });

    const products = this._extractProducts(toolResult);
    const recommendations = this._extractRecommendations(toolResult);
    const checkout = this._extractCheckoutGuidance(toolResult);
    const memoryPatch = this.conversationMemoryEngine.buildContextPatch(sessionContext, {
      plan,
      products,
      recommendations,
      checkout,
    });
    this.conversationContext.recordTurn(plan.sessionId, {
      message: context.message || context.query,
      plan,
      toolResult,
      toolStrategy: plan.toolStrategy,
      products,
      memoryPatch,
    });

    const response = this.formatResponse(
      plan,
      providerResult,
      toolResult,
      products,
      recommendations,
      checkout,
      plan.memoryResolution
    );
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

  formatResponse(
    plan,
    providerResult,
    toolResult,
    products = [],
    recommendations = [],
    checkout = { guidance: [], comparisons: [], availability: null },
    memory = null
  ) {
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
      recommendations,
      checkout,
      memory: memory
        ? {
            hit: memory.hit,
            miss: memory.miss,
            references: memory.references || [],
            resolvedProductId:
              memory.resolvedProduct?._id || memory.resolvedProduct?.id || null,
            resolvedProductName: memory.resolvedProduct?.name || null,
            depth: memory.depth || 0,
          }
        : null,
      searchRequest: plan.searchRequest || null,
      conversation: {
        turnCount: plan.sessionContextSnapshot?.turnCount || 0,
        followUp: plan.conversationFlow?.followUp || false,
        toolStrategy: plan.toolStrategy,
        flowType: plan.conversationFlow?.type || "new_turn",
        productCount: products.length,
        recommendationCount: recommendations.length,
        comparisonCount: checkout.comparisons.length,
        memoryHit: Boolean(memory?.hit),
      },
      meta: {
        phase: "7.7",
        gateway: true,
        streamingPrepared: true,
        productionTools: true,
        naturalLanguageSearch: plan.intent.intent === "search",
        commerceAssistant: true,
        contextualRecommendations: plan.intent.intent === "recommend" || recommendations.length > 0,
        checkoutIntelligence:
          plan.intent.intent === "checkout" ||
          checkout.guidance.length > 0 ||
          checkout.comparisons.length > 0,
        conversationMemory: Boolean(memory?.hit || memory?.miss),
        commerceAgent: true,
      },
    };
  }

  formatConfirmationRequiredResponse(plan, pendingAction, summary) {
    return {
      requestId: plan.requestId,
      sessionId: plan.sessionId,
      correlationId: plan.correlationId,
      type: "confirmation_required",
      intent: plan.intent.intent,
      toolId: WRITE_TOOL_ID,
      message: `Please confirm: ${summary}`,
      pendingAction: {
        pendingActionId: pendingAction.pendingActionId,
        sessionId: pendingAction.sessionId,
        actionChecksum: pendingAction.actionChecksum,
        expiresAt: pendingAction.expiresAt,
        summary: pendingAction.summary,
        toolId: pendingAction.toolId,
        action: pendingAction.action,
      },
      meta: {
        phase: "13.0",
        gateway: true,
        commerceAgent: true,
        confirmationRequired: true,
      },
    };
  }

  async formatConfirmationExecutionResponse({
    requestId,
    sessionId,
    record,
    toolResult,
    message,
    authContext,
  } = {}) {
    const providerResult = await this.providerManager.chat(message || "Action confirmed.", {
      toolResults: toolResult ? [toolResult] : [],
      prompt: "Confirm the completed action briefly.",
      memory: null,
    });

    return {
      requestId,
      sessionId,
      correlationId: requestId,
      type: "confirmation_executed",
      intent: record.intent,
      toolId: record.toolId,
      message: providerResult.content,
      tool: toolResult,
      pendingActionId: record.pendingActionId,
      meta: {
        phase: "13.0",
        gateway: true,
        commerceAgent: true,
        confirmed: true,
        vendorId: authContext?.vendorId || null,
      },
    };
  }

  formatCancellationResponse({ requestId, sessionId } = {}) {
    return {
      requestId,
      sessionId,
      type: "confirmation_cancelled",
      message: "Action cancelled.",
      meta: { phase: "13.0", commerceAgent: true, cancelled: true },
    };
  }

  formatErrorResponse(plan, reason, statusCode = 403) {
    return {
      requestId: plan.requestId,
      sessionId: plan.sessionId,
      correlationId: plan.correlationId,
      type: "error",
      error: { reason, statusCode, message: reason },
      meta: { phase: "13.0", commerceAgent: true },
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
