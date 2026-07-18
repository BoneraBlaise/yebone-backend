const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore } = require("../../index");
const {
  AIPlatform,
  AIConversationContext,
  ConversationMemoryEngine,
} = require("../index");

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

describe("AI Memory — Phase 7.7", () => {
  it("resolves pronoun and ordinal references from session context", () => {
    const engine = new ConversationMemoryEngine();
    const context = {
      turnCount: 3,
      currentProducts: [
        { _id: "p1", name: "Phone A", discountPrice: 200000 },
        { _id: "p2", name: "Phone B", discountPrice: 150000 },
      ],
      currentProduct: { _id: "p2", name: "Phone B", discountPrice: 150000 },
      currentRecommendation: {
        product: { _id: "p2", name: "Phone B", discountPrice: 150000 },
        reasons: ["Lower price"],
      },
    };

    const pronoun = engine.resolve("Can I buy it today?", context);
    assert.equal(pronoun.hit, true);
    assert.equal(pronoun.resolvedProduct.name, "Phone B");

    const cheaper = engine.resolve("What about the cheaper one?", context);
    assert.equal(cheaper.hit, true);
    assert.equal(cheaper.resolvedProduct.name, "Phone B");

    const firstTwo = engine.resolve("Compare the first two", context);
    assert.equal(firstTwo.hit, true);
    assert.equal(firstTwo.resolvedProducts.length, 2);
  });

  it("routes memory references through planner with continuity", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();
    const sessionId = "memory-session-1";
    const planner = platform.planner;

    const originalExecute = platform.toolRegistry.execute.bind(platform.toolRegistry);
    platform.toolRegistry.execute = async (toolId, input, context) => {
      if (toolId === "search.products") {
        return {
          success: true,
          tool: "search.products",
          version: "7.3.0",
          latency: 1,
          data: {
            products: [
              { _id: "p1", name: "Samsung A", discountPrice: 250000, stock: 3 },
              { _id: "p2", name: "Samsung B", discountPrice: 180000, stock: 5 },
            ],
            meta: { count: 2 },
          },
          metadata: {},
          error: null,
        };
      }
      if (toolId === "recommend.contextual") {
        return {
          success: true,
          tool: "recommend.contextual",
          version: "7.5.0",
          latency: 1,
          data: {
            recommendations: [
              {
                rank: 1,
                product: { _id: "p2", name: "Samsung B", discountPrice: 180000, stock: 5 },
                searchPreview: { id: "p2", name: "Samsung B", discountPrice: 180000 },
                reasons: ["Available in stock", "Listed at RWF 180000"],
              },
            ],
            meta: { searchReused: true },
          },
          metadata: {},
          error: null,
        };
      }
      return originalExecute(toolId, input, context);
    };

    const firstPlan = await planner.createPlan({
      requestId: "mem-1",
      sessionId,
      message: "Show Samsung phones",
      type: "chat",
    });
    await planner.execute(firstPlan, { message: "Show Samsung phones", sessionId });

    const secondPlan = await planner.createPlan({
      requestId: "mem-2",
      sessionId,
      message: "Which one do you recommend?",
      type: "chat",
    });
    await planner.execute(secondPlan, { message: "Which one do you recommend?", sessionId });

    const thirdPlan = await planner.createPlan({
      requestId: "mem-3",
      sessionId,
      message: "Can I buy it today?",
      type: "chat",
    });
    assert.equal(thirdPlan.conversationFlow.type, "memory_reference");
    assert.equal(thirdPlan.memoryResolution.hit, true);
    assert.equal(thirdPlan.memoryResolution.resolvedProduct.name, "Samsung B");

    const third = await planner.execute(thirdPlan, { message: "Can I buy it today?", sessionId });
    assert.equal(third.intent, "checkout");
    assert.equal(third.memory.hit, true);
    assert.match(third.message, /purchase decision|available|Samsung B/i);

    platform.toolRegistry.execute = originalExecute;
  });

  it("isolates memory between sessions", async () => {
    const contextStore = new AIConversationContext({ ttlMs: 60_000 });
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.planner.conversationContext = contextStore;
    platform.initialize();
    const planner = platform.planner;

    platform.toolRegistry.execute = async () => ({
      success: true,
      tool: "search.products",
      version: "7.3.0",
      latency: 1,
      data: { products: [{ _id: "p1", name: "Phone" }], meta: { count: 1 } },
      metadata: {},
      error: null,
    });

    const planA = await planner.createPlan({
      requestId: "iso-a",
      sessionId: "memory-a",
      message: "Show Samsung phones",
      type: "chat",
    });
    await planner.execute(planA, { message: "Show Samsung phones", sessionId: "memory-a" });

    const planB = await planner.createPlan({
      requestId: "iso-b",
      sessionId: "memory-b",
      message: "Can I buy it today?",
      type: "chat",
    });
    assert.notEqual(planB.conversationFlow.type, "memory_reference");
    assert.equal(planB.memoryResolution.hit, false);
  });

  it("expires session memory after ttl", () => {
    const contextStore = new AIConversationContext({ ttlMs: 1 });
    contextStore.update("expired-session", {
      turnCount: 2,
      currentProducts: [{ _id: "p1", name: "Phone" }],
      currentProduct: { _id: "p1", name: "Phone" },
    });
    const stored = contextStore.get("expired-session");
    stored.updatedAt = Date.now() - 10;
    contextStore.sessions.set("expired-session", stored);

    const engine = new ConversationMemoryEngine();
    const expiredContext = contextStore.get("expired-session");
    const resolution = engine.resolve("Can I buy it today?", expiredContext);
    assert.equal(expiredContext.turnCount, 0);
    assert.equal(resolution.hit, false);
    assert.equal(resolution.miss, true);
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

  it("chat gateway returns conversation memory metadata", async () => {
    const app = express();
    app.use(express.json());
    const { registerMarketplaceCore } = require("../../index");
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();
    const sessionId = "gateway-memory-session";

    await postJson(port, "/api/v2/ai/chat", { message: "Show Samsung phones", sessionId });
    await postJson(port, "/api/v2/ai/chat", {
      message: "Which one do you recommend?",
      sessionId,
    });
    const third = await postJson(port, "/api/v2/ai/chat", {
      message: "What about the cheaper one?",
      sessionId,
    });
    server.close();

    assert.equal(third.status, 200);
    assert.equal(third.body.data.meta.phase, "7.7");
    assert.equal(third.body.data.meta.conversationMemory, true);
    assert.ok(third.body.data.memory);
  });
});
