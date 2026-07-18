const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore } = require("../../index");
const {
  AIPlatform,
  AIConversationContext,
  ConversationFlowAnalyzer,
  SearchParameterExtractor,
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

describe("AI Assistant — Phase 7.4", () => {
  it("detects follow-up refinements and result questions", () => {
    const analyzer = new ConversationFlowAnalyzer({
      searchParameterExtractor: new SearchParameterExtractor(),
    });
    const context = {
      turnCount: 2,
      lastIntent: "search",
      lastSearchRequest: { brand: "Samsung", category: "phones", q: "phones" },
      lastToolResult: { success: true, data: { products: [{ _id: "p1" }] } },
    };

    const refinement = analyzer.analyze("Only black ones", context);
    assert.equal(refinement.type, "search_refinement");
    assert.equal(refinement.toolStrategy, "execute");

    const question = analyzer.analyze("Which one has the best battery?", context);
    assert.equal(question.type, "result_question");
    assert.equal(question.toolStrategy, "reuse");
  });

  it("supports multi-turn commerce conversation with tool re-execution", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();

    const sessionId = "assistant-session-1";
    const planner = platform.planner;
    const executeSpy = 0;
    const originalExecute = platform.toolRegistry.execute.bind(platform.toolRegistry);
    let executeCalls = 0;
    platform.toolRegistry.execute = async (...args) => {
      executeCalls += 1;
      return {
        success: true,
        tool: "search.products",
        version: "7.3.0",
        latency: 1,
        data: {
          products: [{ _id: "p1", name: "Samsung Phone", discountPrice: 250000 }],
          meta: { count: 1, total: 1 },
        },
        metadata: {},
        error: null,
      };
    };

    const firstPlan = await planner.createPlan({
      requestId: "turn-1",
      sessionId,
      message: "Show Samsung phones",
      type: "chat",
    });
    const first = await planner.execute(firstPlan, { message: "Show Samsung phones", sessionId });
    assert.equal(first.intent, "search");
    assert.equal(first.conversation.toolStrategy, "execute");
    assert.equal(first.searchRequest.brand, "Samsung");

    const secondPlan = await planner.createPlan({
      requestId: "turn-2",
      sessionId,
      message: "Under 300000 RWF",
      type: "chat",
    });
    const second = await planner.execute(secondPlan, { message: "Under 300000 RWF", sessionId });
    assert.equal(second.conversation.followUp, true);
    assert.equal(second.conversation.toolStrategy, "execute");
    assert.equal(second.searchRequest.maxPrice, 300000);
    assert.equal(executeCalls, 2);

    platform.toolRegistry.execute = originalExecute;
  });

  it("reuses previous tool results for follow-up questions", async () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();
    const sessionId = "assistant-session-2";
    const planner = platform.planner;

    let executeCalls = 0;
    const originalExecute = platform.toolRegistry.execute.bind(platform.toolRegistry);
    platform.toolRegistry.execute = async () => {
      executeCalls += 1;
      return {
        success: true,
        tool: "search.products",
        version: "7.3.0",
        latency: 1,
        data: { products: [{ _id: "p1", name: "Phone A" }], meta: { count: 1 } },
        metadata: {},
        error: null,
      };
    };

    const firstPlan = await planner.createPlan({
      requestId: "q-turn-1",
      sessionId,
      message: "Show Samsung phones",
      type: "chat",
    });
    await planner.execute(firstPlan, { message: "Show Samsung phones", sessionId });

    const secondPlan = await planner.createPlan({
      requestId: "q-turn-2",
      sessionId,
      message: "Which one has the best battery?",
      type: "chat",
    });
    const second = await planner.execute(secondPlan, {
      message: "Which one has the best battery?",
      sessionId,
    });

    assert.equal(second.conversation.toolStrategy, "reuse");
    assert.equal(second.tool.metadata.reused, true);
    assert.equal(executeCalls, 1);

    platform.toolRegistry.execute = originalExecute;
  });

  it("isolates conversation context per session", async () => {
    const contextStore = new AIConversationContext();
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.planner.conversationContext = contextStore;
    platform.initialize();

    const planner = platform.planner;
    const originalExecute = platform.toolRegistry.execute.bind(platform.toolRegistry);
    platform.toolRegistry.execute = async () => ({
      success: true,
      tool: "search.products",
      version: "7.3.0",
      latency: 1,
      data: { products: [{ _id: "p1" }], meta: { count: 1 } },
      metadata: {},
      error: null,
    });

    const planA = await planner.createPlan({
      requestId: "a1",
      sessionId: "session-a",
      message: "Show Samsung phones",
      type: "chat",
    });
    await planner.execute(planA, { message: "Show Samsung phones", sessionId: "session-a" });

    const planB = await planner.createPlan({
      requestId: "b1",
      sessionId: "session-b",
      message: "Which one has the best battery?",
      type: "chat",
    });
    const responseB = await planner.execute(planB, {
      message: "Which one has the best battery?",
      sessionId: "session-b",
    });

    assert.notEqual(responseB.conversation.toolStrategy, "reuse");
    platform.toolRegistry.execute = originalExecute;
  });

  it("chat gateway returns commerce assistant metadata with mock provider", async () => {
    const app = express();
    app.use(express.json());
    const { registerMarketplaceCore } = require("../../index");
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();
    const sessionId = "gateway-assistant-session";

    const first = await postJson(port, "/api/v2/ai/chat", {
      message: "Show Samsung phones",
      sessionId,
    });
    const second = await postJson(port, "/api/v2/ai/chat", {
      message: "Which one has the best battery?",
      sessionId,
    });
    server.close();

    assert.equal(first.status, 200);
    assert.equal(first.body.data.meta.commerceAssistant, true);
    assert.equal(first.body.data.provider.mock, true);
    assert.equal(second.body.data.conversation.followUp, true);
    assert.equal(second.body.data.meta.phase, "7.4");
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
});
