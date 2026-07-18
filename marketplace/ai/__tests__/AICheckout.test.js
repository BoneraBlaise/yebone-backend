const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore } = require("../../index");
const {
  AIPlatform,
  ConversationFlowAnalyzer,
  CheckoutIntelligenceEngine,
  SearchParameterExtractor,
} = require("../index");
const { CatalogTool, CheckoutTool } = require("../tools");

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
      searchProducts: async () => ({ products: [], meta: { count: 0, empty: true } }),
      searchShops: async () => ({ shops: [], meta: { count: 0, empty: true } }),
      suggest: async () => ({ suggestions: [] }),
      listCategories: async () => ({ categories: [], meta: { count: 0 } }),
      searchService: {},
    },
    product: {
      catalog: {
        getById: async (id) => ({
          _id: id,
          name: id === "p1" ? "Budget Phone" : "Premium Phone",
          discountPrice: id === "p1" ? 180000 : 250000,
          stock: id === "p1" ? 5 : 2,
          averageRating: id === "p1" ? 4.1 : 4.6,
          featured: id === "p2",
          images: ["img.jpg"],
          description: "Catalog detail",
          shop: { name: "Tech Store" },
        }),
        listByShop: async () => [],
      },
      pricing: {
        getSummary: (product) => ({
          discountPrice: product.discountPrice,
          originalPrice: null,
        }),
      },
      analytics: {
        getSummary: () => ({ views: 10 }),
      },
    },
  };
}

describe("AI Checkout — Phase 7.6", () => {
  it("detects checkout intent in conversation flow analyzer", () => {
    const analyzer = new ConversationFlowAnalyzer({
      searchParameterExtractor: new SearchParameterExtractor(),
    });
    const context = {
      turnCount: 2,
      currentProducts: [
        { _id: "p1", name: "Phone A" },
        { _id: "p2", name: "Phone B" },
      ],
      lastToolResult: { success: true, data: { products: [{ _id: "p1" }, { _id: "p2" }] } },
    };

    const flow = analyzer.analyze("Which one is cheaper overall?", context);
    assert.equal(flow.type, "checkout_request");
    assert.equal(flow.intent, "checkout");
    assert.equal(flow.toolStrategy, "execute");
    assert.equal(flow.reuseToolResults, true);
  });

  it("compares products deterministically with transparent guidance", () => {
    const engine = new CheckoutIntelligenceEngine();
    const products = [
      { _id: "p1", name: "Budget Phone", discountPrice: 180000, stock: 4, averageRating: 4.2 },
      { _id: "p2", name: "Premium Phone", discountPrice: 250000, stock: 2, averageRating: 4.7, featured: true },
    ];

    const first = engine.compareProducts(products, { mode: "value" });
    const second = engine.compareProducts(products, { mode: "value" });

    assert.deepEqual(
      first.comparisons.map((entry) => entry.preview.id),
      second.comparisons.map((entry) => entry.preview.id)
    );
    assert.equal(first.comparisons[0].preview.name, "Budget Phone");
    assert.ok(first.guidance.length > 0);
  });

  it("CheckoutTool reuses existing session products and stays read-only", async () => {
    const platforms = createStubPlatforms();
    const catalogTool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const tool = new CheckoutTool({ catalogTool }).initialize();

    const result = await tool.run(
      { message: "Should I buy Product A or Product B?" },
      {
        sessionContext: {
          currentProducts: [
            { _id: "p1", name: "Budget Phone", discountPrice: 180000, stock: 3 },
            { _id: "p2", name: "Premium Phone", discountPrice: 250000, stock: 1 },
          ],
        },
      }
    );

    assert.equal(result.success, true);
    assert.equal(result.data.meta.sourceReused, true);
    assert.equal(result.data.meta.readOnly, true);
    assert.equal(result.data.meta.orderCreation, false);
    assert.equal(result.data.meta.paymentExecution, false);
    assert.ok(result.data.comparisons.length >= 2);
    assert.ok(result.data.guidance.length > 0);
  });

  it("provides availability guidance for a single product", async () => {
    const platforms = createStubPlatforms();
    const catalogTool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const tool = new CheckoutTool({ catalogTool }).initialize();

    const result = await tool.run(
      { message: "Is this product currently available?" },
      {
        sessionContext: {
          currentProducts: [{ _id: "p1", name: "Budget Phone", discountPrice: 180000, stock: 4 }],
        },
      }
    );

    assert.equal(result.success, true);
    assert.equal(result.data.availability.available, true);
    assert.match(result.data.guidance.join(" "), /available/i);
  });

  it("routes checkout follow-ups through CheckoutTool and explains results", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();
    const sessionId = "checkout-session-1";
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
              { _id: "p1", name: "Phone A", discountPrice: 180000, stock: 4, averageRating: 4.2 },
              { _id: "p2", name: "Phone B", discountPrice: 250000, stock: 2, averageRating: 4.6 },
            ],
            meta: { count: 2 },
          },
          metadata: {},
          error: null,
        };
      }
      return originalExecute(toolId, input, context);
    };

    const firstPlan = await planner.createPlan({
      requestId: "checkout-turn-1",
      sessionId,
      message: "Show Samsung phones",
      type: "chat",
    });
    await planner.execute(firstPlan, { message: "Show Samsung phones", sessionId });

    const secondPlan = await planner.createPlan({
      requestId: "checkout-turn-2",
      sessionId,
      message: "Which phone gives me better value?",
      type: "chat",
    });
    assert.equal(secondPlan.intent.intent, "checkout");
    assert.equal(secondPlan.toolId, "checkout.guide");

    const second = await planner.execute(secondPlan, {
      message: "Which phone gives me better value?",
      sessionId,
    });

    assert.equal(second.intent, "checkout");
    assert.ok(second.checkout.comparisons.length > 0);
    assert.ok(second.checkout.guidance.length > 0);
    assert.match(second.message, /purchase decision|stands out|available/i);
    assert.equal(second.tool.data.meta.sourceReused, true);
    assert.equal(executeCalls, 2);

    platform.toolRegistry.execute = originalExecute;
  });

  it("handles empty comparison context gracefully", async () => {
    const platforms = createStubPlatforms();
    const catalogTool = new CatalogTool({
      productPlatform: platforms.product,
      searchPlatform: platforms.search,
    }).initialize();
    const tool = new CheckoutTool({ catalogTool }).initialize();
    const result = await tool.run({ message: "Compare these" });

    assert.equal(result.success, true);
    assert.equal(result.data.meta.empty, true);
    assert.ok(result.data.guidance.length > 0);
  });

  it("continues to enforce authorization for protected tools", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();

    await assert.rejects(
      () => platform.toolRegistry.execute("order.get", { action: "history" }, { userId: null }),
      (err) => err.code === "permission_denied"
    );
  });

  it("chat gateway returns checkout intelligence metadata with mock provider", async () => {
    const app = express();
    app.use(express.json());
    const { registerMarketplaceCore } = require("../../index");
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();
    const sessionId = "gateway-checkout-session";

    const first = await postJson(port, "/api/v2/ai/chat", {
      message: "Show Samsung phones",
      sessionId,
    });
    const second = await postJson(port, "/api/v2/ai/chat", {
      message: "Which one is cheaper overall?",
      sessionId,
    });
    server.close();

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.intent, "checkout");
    assert.equal(second.body.data.meta.phase, "7.6");
    assert.equal(second.body.data.meta.checkoutIntelligence, true);
    assert.equal(second.body.data.toolId, "checkout.guide");
    assert.ok(Array.isArray(second.body.data.checkout?.guidance));
  });
});
