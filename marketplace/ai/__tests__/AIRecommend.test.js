const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore } = require("../../index");
const {
  AIPlatform,
  AIConversationContext,
  ConversationFlowAnalyzer,
  RecommendationEngine,
  SearchParameterExtractor,
} = require("../index");
const {
  SearchTool,
  CatalogTool,
  RecommendationTool,
} = require("../tools");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";

function postJson(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(data || "{}") });
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function createStubPlatforms() {
  return {
    search: {
      searchProducts: async (query) => ({
        products: [
          {
            _id: "p1",
            name: "Budget Runner",
            discountPrice: 45000,
            stock: 4,
            averageRating: 4.2,
            images: ["img1.jpg"],
            description: "Lightweight running shoe",
          },
          {
            _id: "p2",
            name: "Premium Runner",
            discountPrice: 120000,
            stock: 2,
            averageRating: 4.8,
            featured: true,
            images: ["img2.jpg"],
            description: "Premium cushioning",
          },
        ],
        meta: { count: 2, query: query.q, empty: false },
      }),
      searchShops: async () => ({ shops: [], meta: { count: 0, empty: true } }),
      suggest: async () => ({ suggestions: ["running shoes"] }),
      listCategories: async () => ({ categories: ["Shoes"], meta: { count: 1 } }),
      searchService: {},
    },
    product: {
      catalog: {
        getById: async (id) => ({
          _id: id,
          name: id === "p1" ? "Budget Runner" : "Premium Runner",
          discountPrice: id === "p1" ? 45000 : 120000,
          stock: id === "p1" ? 4 : 2,
          averageRating: id === "p1" ? 4.2 : 4.8,
          featured: id === "p2",
          images: ["img.jpg"],
          description: "Catalog detail",
        }),
        listByShop: async () => [],
      },
      pricing: {
        getSummary: (product) => ({
          discountPrice: product.discountPrice,
          originalPrice: null,
        }),
      },
    },
  };
}

describe("AI Recommend — Phase 7.5", () => {
  it("detects recommendation intent in conversation flow analyzer", () => {
    const analyzer = new ConversationFlowAnalyzer({
      searchParameterExtractor: new SearchParameterExtractor(),
    });
    const context = {
      turnCount: 2,
      lastIntent: "search",
      currentProducts: [{ _id: "p1", name: "Phone" }],
      lastToolResult: { success: true, data: { products: [{ _id: "p1" }] } },
    };

    const flow = analyzer.analyze("Which one do you recommend?", context);
    assert.equal(flow.type, "recommendation_request");
    assert.equal(flow.intent, "recommend");
    assert.equal(flow.toolStrategy, "execute");
    assert.equal(flow.reuseSearchResults, true);
  });

  it("ranks products deterministically with transparent reasons", () => {
    const engine = new RecommendationEngine();
    const products = [
      { _id: "p1", name: "A", discountPrice: 90000, stock: 1, averageRating: 4.0 },
      { _id: "p2", name: "B", discountPrice: 50000, stock: 3, averageRating: 4.6, featured: true },
    ];

    const first = engine.rank(products, { preferAffordable: true, limit: 2 });
    const second = engine.rank(products, { preferAffordable: true, limit: 2 });

    assert.deepEqual(
      first.recommendations.map((entry) => entry.searchPreview.id),
      second.recommendations.map((entry) => entry.searchPreview.id)
    );
    assert.ok(first.recommendations[0].reasons.length > 0);
    assert.ok(first.rulesApplied.includes("availability"));
  });

  it("RecommendationTool reuses existing search results when available", async () => {
    const platforms = createStubPlatforms();
    const searchTool = new SearchTool({ searchPlatform: platforms.search }).initialize();
    const catalogTool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const tool = new RecommendationTool({ searchTool, catalogTool }).initialize();

    let searchCalls = 0;
    const originalSearchExecute = searchTool.execute.bind(searchTool);
    searchTool.execute = async (...args) => {
      searchCalls += 1;
      return originalSearchExecute(...args);
    };

    const result = await tool.run(
      { message: "Which one do you recommend?" },
      {
        sessionContext: {
          currentProducts: [{ _id: "p1", name: "Budget Runner", discountPrice: 45000, stock: 2 }],
          lastSearchRequest: { q: "running shoes", maxPrice: 60000 },
        },
      }
    );

    assert.equal(result.success, true);
    assert.equal(searchCalls, 0);
    assert.equal(result.data.meta.searchReused, true);
    assert.ok(result.data.recommendations.length > 0);
    assert.ok(result.data.recommendations[0].reasons.length > 0);
  });

  it("routes recommendation follow-ups through RecommendationTool and explains results", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();
    const sessionId = "recommend-session-1";
    const planner = platform.planner;

    let executeCalls = 0;
    const originalExecute = platform.toolRegistry.execute.bind(platform.toolRegistry);
    platform.toolRegistry.execute = async (toolId, input, context) => {
      executeCalls += 1;
      if (toolId === "search.products") {
        return {
          success: true,
          tool: "search.products",
          version: "7.3.0",
          latency: 2,
          data: {
            products: [
              { _id: "p1", name: "Samsung A", discountPrice: 250000, stock: 5, averageRating: 4.4 },
              { _id: "p2", name: "Samsung B", discountPrice: 180000, stock: 3, averageRating: 4.1 },
            ],
            meta: { count: 2 },
          },
          metadata: {},
          error: null,
        };
      }
      if (toolId === "recommend.contextual") {
        return originalExecute(toolId, input, context);
      }
      return originalExecute(toolId, input, context);
    };

    const firstPlan = await planner.createPlan({
      requestId: "rec-turn-1",
      sessionId,
      message: "Show Samsung phones",
      type: "chat",
    });
    await planner.execute(firstPlan, { message: "Show Samsung phones", sessionId });

    const secondPlan = await planner.createPlan({
      requestId: "rec-turn-2",
      sessionId,
      message: "Which one do you recommend?",
      type: "chat",
    });
    assert.equal(secondPlan.intent.intent, "recommend");
    assert.equal(secondPlan.toolId, "recommend.contextual");
    assert.equal(secondPlan.conversationFlow.type, "recommendation_request");

    const second = await planner.execute(secondPlan, {
      message: "Which one do you recommend?",
      sessionId,
    });

    assert.equal(second.intent, "recommend");
    assert.ok(second.recommendations.length > 0);
    assert.ok(second.recommendations[0].reasons.length > 0);
    assert.match(second.message, /recommend/i);
    assert.equal(second.tool.data.meta.searchReused, true);
    assert.equal(executeCalls, 2);

    platform.toolRegistry.execute = originalExecute;
  });

  it("handles empty recommendation sources gracefully", async () => {
    const platforms = createStubPlatforms();
    platforms.search.searchProducts = async () => ({
      products: [],
      meta: { count: 0, empty: true },
    });
    const searchTool = new SearchTool({ searchPlatform: platforms.search }).initialize();
    const catalogTool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const tool = new RecommendationTool({ searchTool, catalogTool }).initialize();
    const result = await tool.run({ q: "unknown product" });

    assert.equal(result.success, true);
    assert.equal(result.data.recommendations.length, 0);
    assert.equal(result.data.meta.empty, true);
  });

  it("continues to enforce authorization for protected tools", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();
    const registry = platform.toolRegistry;

    await assert.rejects(
      () => registry.execute("order.get", { action: "history" }, { userId: null }),
      (err) => err.code === "permission_denied"
    );
  });

  it("chat gateway returns recommendation metadata with mock provider", async () => {
    const app = express();
    app.use(express.json());
    const { registerMarketplaceCore } = require("../../index");
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();
    const sessionId = "gateway-recommend-session";

    const first = await postJson(port, "/api/v2/ai/chat", {
      message: "Show Samsung phones",
      sessionId,
    });
    const second = await postJson(port, "/api/v2/ai/chat", {
      message: "Which one do you recommend?",
      sessionId,
    });
    server.close();

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.intent, "recommend");
    assert.equal(second.body.data.meta.phase, "7.7");
    assert.equal(second.body.data.meta.contextualRecommendations, true);
    assert.match(second.body.data.message, /recommend/i);
  });
});
