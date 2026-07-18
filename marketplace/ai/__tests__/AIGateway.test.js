const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const {
  AIPlatform,
  AIPromptRegistry,
  AIToolRegistry,
  AIProviderManager,
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

describe("AI Gateway — Phase 7.1/7.2", () => {
  it("registers AI platform with marketplace core", () => {
    const core = new MarketplaceCore();
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();

    assert.equal(platform.config.version, "7.7.0");
    assert.equal(platform.toolRegistry.list().length, 8);
    assert.equal(platform.providerManager.activeProviderId, "mock");
  });

  it("loads versioned prompt registry", () => {
    const registry = new AIPromptRegistry();
    const composed = registry.compose(["system", "safety", "commerce"], {
      region: "RW",
      language: "en",
    });
    assert.ok(composed.layers.includes("system@1.0.0"));
    assert.ok(composed.instruction.includes("YEBO"));
  });

  it("exposes AI health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/ai/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    server.close();
    assert.equal(response.success, true);
    assert.equal(response.data.healthy, true);
    assert.equal(response.data.mockProviderActive, true);
    assert.equal(response.data.toolsRegistered, 8);
    assert.equal(response.data.productionTools, true);
    assert.equal(response.data.phase, "7.7");
    assert.equal(response.data.naturalLanguageSearch, true);
    assert.equal(response.data.commerceAssistant, true);
    assert.equal(response.data.contextualRecommendations, true);
    assert.equal(response.data.checkoutIntelligence, true);
    assert.equal(response.data.conversationMemory, true);
  });

  it("handles chat gateway requests with mock provider", async () => {
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await postJson(port, "/api/v2/ai/chat", {
      message: "find white sneakers",
      sessionId: "test-session",
    });

    server.close();
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.message.includes("YEBO"));
    assert.equal(response.body.data.provider.mock, true);
    assert.equal(typeof response.body.data.tool.success, "boolean");
    assert.equal(response.body.data.tool.tool, "search.products");
    assert.equal(response.body.data.meta.phase, "7.7");
  });

  it("handles search gateway requests", async () => {
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await postJson(port, "/api/v2/ai/search", {
      query: "laptops under 500000",
    });

    server.close();
    assert.equal(response.status, 200);
    assert.equal(response.body.data.intent, "search");
    assert.equal(response.body.data.toolId, "search.products");
  });

  it("rejects empty chat messages", async () => {
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();
    const response = await postJson(port, "/api/v2/ai/chat", { message: "   " });
    server.close();

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  it("mock provider manager registers placeholder providers", () => {
    const manager = new AIProviderManager({ primaryProvider: "mock" });
    manager.initializeAll();
    const health = manager.listProviders();
    assert.ok(health.some((p) => p.id === "openrouter"));
    assert.ok(health.some((p) => p.id === "mock"));
  });

  it("tool registry enforces permissions for order tool", async () => {
    const core = new MarketplaceCore();
    const registry = new AIToolRegistry();
    registry.registerProductionTools({ marketplaceCore: core });
    await assert.rejects(
      () => registry.execute("order.get", { action: "history" }, { userId: null }),
      (err) => err.code === "permission_denied"
    );
  });
});
