const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { MarketplaceCore } = require("../../index");
const {
  AIPlatform,
  AIToolRegistry,
  AICapabilityRegistry,
  AIPlanner,
  AIPromptRegistry,
  AIProviderManager,
} = require("../index");
const {
  SearchTool,
  CatalogTool,
  VendorTool,
  OrderTool,
  PaymentTool,
  RecommendationTool,
  KnowledgeTool,
  ToolResult,
} = require("../tools");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";

function createStubPlatforms() {
  return {
    search: {
      searchProducts: async (query) => ({
        products: [{ _id: "p1", name: "Stub Product", discountPrice: 1000 }],
        meta: { count: 1, query: query.q, empty: false },
      }),
      searchShops: async () => ({ shops: [], meta: { count: 0, empty: true } }),
      suggest: async () => ({ suggestions: ["stub"] }),
      listCategories: async () => ({ categories: ["Electronics"], meta: { count: 1 } }),
      searchService: {},
    },
    product: {
      catalog: {
        getById: async () => ({
          _id: "p1",
          name: "Stub Product",
          discountPrice: 1000,
          stock: 5,
        }),
        listByShop: async () => [],
      },
      pricing: {
        getSummary: (product) => ({
          discountPrice: product.discountPrice,
          originalPrice: null,
          hasDiscount: false,
          currency: "RWF",
        }),
      },
      analytics: {
        getSummary: () => ({ lifecycleState: "active" }),
      },
    },
    vendor: {
      profile: {
        getPublicInfo: async () => ({
          _id: "s1",
          name: "Stub Shop",
          isVerified: true,
        }),
      },
      analytics: {
        getBasicSummary: () => ({ shopId: "s1", isVerified: true }),
      },
    },
    order: {
      history: {
        listForUser: async () => [{ _id: "o1", status: "Processing", user: { _id: "u1" }, cart: [] }],
        getById: async () => ({
          _id: "o1",
          status: "Processing",
          user: { _id: "u1" },
          cart: [],
          paymentInfo: { status: "Pending" },
        }),
      },
      status: {
        getSummary: () => ({ status: "Processing", phase: "fulfillment" }),
        getFulfillmentOptions: () => ["Delivered"],
      },
    },
  };
}

describe("AI Tools — Phase 7.2", () => {
  it("registers production tools with unified contract methods", () => {
    const core = new MarketplaceCore();
    const registry = new AIToolRegistry();
    registry.registerProductionTools({ marketplaceCore: core, platforms: createStubPlatforms() });

    assert.equal(registry.list().length, 8);
    for (const tool of registry.list()) {
      assert.equal(tool.hasExecute, true);
      assert.ok(Array.isArray(tool.capabilities));
      assert.ok(tool.capabilities.length > 0);
    }
  });

  it("returns ToolResult contract from tool.run()", async () => {
    const tool = new KnowledgeTool().initialize();
    const result = await tool.run({ q: "track order" }, { correlationId: "corr-1" });

    assert.equal(result.success, true);
    assert.equal(result.tool, "knowledge.faq");
    assert.equal(result.version, "7.2.0");
    assert.equal(typeof result.latency, "number");
    assert.ok(result.data.articles.length > 0);
    assert.equal(result.error, null);
    assert.equal(result.metadata.correlationId, "corr-1");
  });

  it("SearchTool delegates query mapping to SearchPlatform without local filtering", async () => {
    let captured = null;
    const searchPlatform = {
      searchProducts: async (query) => {
        captured = query;
        return { products: [], meta: { count: 0, empty: true } };
      },
    };
    const tool = new SearchTool({ searchPlatform }).initialize();
    await tool.run({
      q: "phones",
      category: "Electronics",
      minPrice: 1000,
      page: 2,
      limit: 10,
      sort: "priceLowToHigh",
    });

    assert.equal(captured.q, "phones");
    assert.equal(captured.category, "Electronics");
    assert.equal(captured.minPrice, 1000);
    assert.equal(captured.page, 2);
    assert.equal(captured.limit, 10);
    assert.equal(captured.sort, "priceLowToHigh");
  });

  it("CatalogTool reads product details via ProductPlatform", async () => {
    const platforms = createStubPlatforms();
    const tool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const result = await tool.run({ productId: "p1", action: "product_details" });

    assert.equal(result.success, true);
    assert.equal(result.data.product.name, "Stub Product");
  });

  it("VendorTool returns shop metadata and statistics", async () => {
    const platforms = createStubPlatforms();
    const tool = new VendorTool({
      vendorPlatform: platforms.vendor,
      searchPlatform: platforms.search,
    }).initialize();
    const result = await tool.run({ shopId: "s1" });

    assert.equal(result.success, true);
    assert.equal(result.data.shop.name, "Stub Shop");
    assert.equal(result.data.statistics.shopId, "s1");
  });

  it("OrderTool enforces authenticated owner access", async () => {
    const platforms = createStubPlatforms();
    const tool = new OrderTool({ orderPlatform: platforms.order }).initialize();
    const denied = await tool.run({ action: "history" }, { userId: null });
    assert.equal(denied.success, false);
    assert.equal(denied.error.code, "permission_denied");

    const allowed = await tool.run({ action: "history" }, { userId: "u1" });
    assert.equal(allowed.success, true);
    assert.equal(allowed.data.orders.length, 1);
  });

  it("OrderTool rejects mutations in Phase 7.2", async () => {
    const platforms = createStubPlatforms();
    const tool = new OrderTool({ orderPlatform: platforms.order }).initialize();
    const result = await tool.run({ action: "cancel", orderId: "o1" }, { userId: "u1" });
    assert.equal(result.success, false);
    assert.equal(result.error.code, "mutation_not_supported");
  });

  it("PaymentTool reports readiness without initiating payments", async () => {
    const core = new MarketplaceCore();
    const tool = new PaymentTool({ marketplaceCore: core }).initialize();
    const result = await tool.run({ action: "readiness" });

    assert.equal(result.success, true);
    assert.ok(["ready", "disabled"].includes(result.data.readiness));
    assert.deepEqual(result.data.supportedProviders, ["CARD", "MOMO"]);

    const blocked = await tool.run({ action: "charge" });
    assert.equal(blocked.success, false);
    assert.equal(blocked.error.code, "mutation_not_supported");
  });

  it("RecommendationTool composes SearchTool and CatalogTool candidates", async () => {
    const platforms = createStubPlatforms();
    const searchTool = new SearchTool({ searchPlatform: platforms.search }).initialize();
    const catalogTool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const tool = new RecommendationTool({ searchTool, catalogTool }).initialize();
    const result = await tool.run({ q: "phones" });

    assert.equal(result.success, true);
    assert.equal(result.data.recommendations.length, 1);
    assert.equal(result.data.meta.engine, "RecommendationEngine");
    assert.deepEqual(result.data.meta.composedFrom.includes("RecommendationEngine"), true);
  });

  it("capability registry resolves tools without hardcoded planner names", () => {
    const core = new MarketplaceCore();
    const registry = new AIToolRegistry();
    registry.registerProductionTools({ marketplaceCore: core, platforms: createStubPlatforms() });

    const capabilities = new AICapabilityRegistry();
    capabilities.registerFromTools([...registry.tools.values()]);

    const searchRoute = capabilities.resolveIntent({
      intent: "search",
      capabilities: ["keyword", "pagination"],
    });
    assert.equal(searchRoute.toolId, "search.products");

    const orderRoute = capabilities.resolveIntent({
      intent: "order_status",
      capabilities: ["history", "tracking"],
    });
    assert.equal(orderRoute.toolId, "order.get");
  });

  it("planner selects tools via capability registry", async () => {
    const core = new MarketplaceCore();
    const AIMetrics = require("../AIMetrics");
    const metricTracker = new AIMetrics();
    const toolRegistry = new AIToolRegistry({ metrics: metricTracker });
    toolRegistry.registerProductionTools({ marketplaceCore: core, platforms: createStubPlatforms() });

    const capabilityRegistry = new AICapabilityRegistry();
    capabilityRegistry.registerFromTools([...toolRegistry.tools.values()]);

    const planner = new AIPlanner({
      toolRegistry,
      capabilityRegistry,
      promptRegistry: new AIPromptRegistry(),
      providerManager: new AIProviderManager({ primaryProvider: "mock" }),
      hooks: { emit: async () => {} },
      metrics: metricTracker,
      config: {},
    });

    const plan = await planner.createPlan({
      requestId: "req-1",
      message: "find laptops",
      type: "search",
    });

    assert.equal(plan.toolId, "search.products");
    assert.ok(plan.capabilities.includes("keyword"));
    assert.equal(plan.routing.score > 0, true);
  });

  it("AIToolRegistry health check reports all initialized tools", () => {
    const core = new MarketplaceCore();
    const registry = new AIToolRegistry();
    registry.registerProductionTools({ marketplaceCore: core, platforms: createStubPlatforms() });
    const health = registry.healthCheck();
    assert.equal(health.healthy, true);
    assert.equal(health.tools.length, 8);
  });

  it("ToolResult helpers normalize success and failure", () => {
    const ok = ToolResult.success({ tool: "test", version: "7.2.0", latency: 3, data: { ok: true } });
    assert.equal(ok.success, true);
    assert.equal(ok.error, null);

    const fail = ToolResult.failure({
      tool: "test",
      version: "7.2.0",
      latency: 1,
      error: new Error("boom"),
    });
    assert.equal(fail.success, false);
    assert.equal(fail.error.message, "boom");
  });

  it("AIPlatform initializes production tools and capability registry", () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();

    assert.equal(platform.config.version, "7.6.0");
    assert.equal(platform.toolRegistry.list().length, 8);
    assert.ok(platform.capabilityRegistry.listCapabilities().length >= 7);
  });
});
