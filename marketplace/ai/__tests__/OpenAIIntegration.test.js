const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const OpenAIConfiguration = require("../providers/openai/OpenAIConfiguration");
const { estimateCostUsd } = require("../providers/openai/OpenAICostEstimator");
const OpenAIProvider = require("../providers/contracts/OpenAIProvider");
const OpenAIVisionProvider = require("../providers/contracts/OpenAIVisionProvider");
const AIProviderRegistry = require("../providers/AIProviderRegistry");
const AIRouter = require("../router/AIRouter");
const { AI_SERVICE } = require("../commerce/CreditPolicy");
const { maskForCustomer } = require("../utils/ProviderMasking");
const { registerMarketplaceCore } = require("../../index");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";
delete process.env.OPENAI_API_KEY;

function requestJson({ port, path, method = "GET", body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: payload
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data || "{}") });
          } catch {
            resolve({ status: res.statusCode, body: { raw: data } });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("Sprint 16.1 — OpenAI configuration", () => {
  it("reads env vars without hardcoding keys", () => {
    const config = new OpenAIConfiguration({ apiKey: "test-key", model: "gpt-4o-mini" });
    assert.equal(config.isConfigured(), true);
    assert.equal(config.publicModelAlias, "yebo-ai-v1");
  });

  it("estimates provider cost from token usage", () => {
    const cost = estimateCostUsd("gpt-4o-mini", { inputTokens: 1000, outputTokens: 500 });
    assert.ok(cost.estimatedCostUsd >= 0);
    assert.equal(cost.totalTokens, 1500);
  });
});

describe("Sprint 16.1 — OpenAI providers mock fallback", () => {
  it("OpenAIProvider falls back without API key", async () => {
    const provider = new OpenAIProvider({});
    await provider.initialize();
    assert.equal(provider.isLive, false);
    const result = await provider.execute("hello", { mode: "chat" });
    assert.ok(result.content);
    assert.equal(result.displayBrand, "YEBO AI");
  });

  it("registry uses mock when key unset", async () => {
    const registry = new AIProviderRegistry();
    await registry.initializeAll();
    assert.equal(registry.getSnapshot().openaiConfigured, false);
  });

  it("router routes image_search to vision", async () => {
    const registry = new AIProviderRegistry();
    await registry.initializeAll();
    const router = new AIRouter(registry);
    const routing = router.route({ serviceType: AI_SERVICE.IMAGE_SEARCH, scope: "image_search", input: "{}" });
    assert.equal(routing.providerId, "vision");
  });
});

describe("Sprint 16.1 — provider masking", () => {
  it("masks OpenAI from customers", () => {
    const masked = maskForCustomer({ model: "gpt-4o-mini", providerId: "openai", message: "OpenAI GPT" });
    assert.equal(masked.displayBrand, "YEBO AI");
    assert.equal(masked.providerId, undefined);
  });
});

describe("Sprint 16.1 — HTTP gateway", () => {
  let server;
  let port;

  before(async () => {
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app);
    app.use("/api/v2/ai", require("../../../controller/ai"));
    server = app.listen(0);
    port = server.address().port;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it("POST /ai/intelligence returns YEBO AI result", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/intelligence",
      method: "POST",
      body: { mode: "budget", selection: { budget: 100000 } },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.displayBrand, "YEBO AI");
  });

  it("POST /ai/search/image rejects missing image", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/search/image",
      method: "POST",
      body: {},
    });
    assert.equal(response.status, 400);
  });
});
