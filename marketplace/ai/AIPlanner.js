class AIPlanner {
  constructor({ toolRegistry, promptRegistry, providerManager, hooks, metrics, config } = {}) {
    this.toolRegistry = toolRegistry;
    this.promptRegistry = promptRegistry;
    this.providerManager = providerManager;
    this.hooks = hooks;
    this.metrics = metrics;
    this.config = config;
  }

  detectIntent({ message, type = "chat" } = {}) {
    const text = String(message || "").toLowerCase();
    if (type === "search") {
      return { intent: "search", toolId: "search.products", confidence: 0.9 };
    }
    if (text.includes("order") || text.includes("track")) {
      return { intent: "order_status", toolId: "order.get", confidence: 0.7 };
    }
    if (text.includes("shop") || text.includes("vendor") || text.includes("seller")) {
      return { intent: "vendor_lookup", toolId: "vendor.shop.get", confidence: 0.65 };
    }
    if (text.includes("recommend") || text.includes("suggest")) {
      return { intent: "recommend", toolId: "recommend.contextual", confidence: 0.75 };
    }
    if (text.includes("pay") || text.includes("checkout")) {
      return { intent: "payment", toolId: "payment.readiness", confidence: 0.6 };
    }
    if (text.includes("product") || text.includes("catalog")) {
      return { intent: "catalog", toolId: "catalog.product.get", confidence: 0.6 };
    }
    if (text.includes("help") || text.includes("policy") || text.includes("faq")) {
      return { intent: "knowledge", toolId: "knowledge.faq", confidence: 0.55 };
    }
    if (text.includes("search") || text.includes("find")) {
      return { intent: "search", toolId: "search.products", confidence: 0.8 };
    }
    return { intent: "commerce_chat", toolId: "knowledge.faq", confidence: 0.5 };
  }

  buildPromptLayers(intent) {
    const layers = ["system", "safety"];
    if (intent.intent === "search") layers.push("search");
    else layers.push("commerce");
    return layers;
  }

  async createPlan(request = {}) {
    const intent = this.detectIntent(request);
    const promptLayers = this.buildPromptLayers(intent);
    const prompts = this.promptRegistry.compose(promptLayers, {
      region: request.region || "RW",
      language: request.language || "en",
    });

    return {
      requestId: request.requestId,
      sessionId: request.sessionId || null,
      intent,
      toolId: intent.toolId,
      providerId: this.providerManager.activeProviderId,
      promptVersions: prompts.layers,
      prompts,
    };
  }

  async execute(plan, context = {}) {
    await this.hooks.emit("beforeTurn", { plan, context });

    const toolInput =
      plan.intent.intent === "search"
        ? { q: context.message || context.query }
        : { q: context.message || context.query, scope: context.scope };

    let toolResult = null;
    try {
      toolResult = await this.toolRegistry.execute(plan.toolId, toolInput, {
        userId: context.userId || null,
      });
      this.metrics.recordToolCall();
      await this.hooks.emit("afterTool", { toolId: plan.toolId, toolResult });
    } catch (err) {
      toolResult = { toolId: plan.toolId, error: err.message, mock: true };
    }

    this.metrics.recordProviderCall();
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
      intent: plan.intent.intent,
      toolId: plan.toolId,
      promptVersions: plan.promptVersions,
      provider: {
        id: providerResult.providerId,
        model: providerResult.model,
        mock: providerResult.mock !== false,
      },
      tool: toolResult,
      message: providerResult.content,
      meta: { phase: "7.1", gateway: true, streamingPrepared: true },
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
