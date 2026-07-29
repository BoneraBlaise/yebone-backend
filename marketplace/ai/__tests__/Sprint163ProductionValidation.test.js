/**
 * Sprint 16.3 — End-to-end production validation (mock mode, no live API keys).
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const AIProviderRegistry = require("../providers/AIProviderRegistry");
const AIRouter = require("../router/AIRouter");
const FashionProvider = require("../providers/contracts/FashionProvider");
const OpenAIProvider = require("../providers/contracts/OpenAIProvider");
const { AI_SERVICE, AI_PREVIEW_TYPE } = require("../commerce/CreditPolicy");
const { maskForCustomer, maskForVendor, maskForAdmin } = require("../utils/ProviderMasking");
const { analyticsFromProvider, recordAnalytics } = require("../analytics/AIAnalyticsRecorder");
const { registerMarketplaceCore } = require("../../index");
const { getAIPlatform } = require("../index");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";
delete process.env.OPENAI_API_KEY;
delete process.env.FASHN_API_KEY;

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

describe("Sprint 16.3 — deployment readiness", () => {
  it("activates live providers when keys are set without code changes", async () => {
    const prevOpenai = process.env.OPENAI_API_KEY;
    const prevFashn = process.env.FASHN_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.FASHN_API_KEY = "fashn-test";

    try {
      const registry = new AIProviderRegistry();
      await registry.initializeAll();
      const snap = registry.getSnapshot();
      assert.equal(snap.openaiConfigured, true);
      assert.equal(snap.fashnConfigured, true);
      assert.equal(snap.providers.find((p) => p.id === "llm")?.configured, true);
      assert.equal(snap.providers.find((p) => p.id === "fashion")?.configured, true);
    } finally {
      if (prevOpenai === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevOpenai;
      if (prevFashn === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = prevFashn;
    }
  });

  it("uses mock providers when keys are missing", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.FASHN_API_KEY;
    const registry = new AIProviderRegistry();
    await registry.initializeAll();
    const snap = registry.getSnapshot();
    assert.equal(snap.openaiConfigured, false);
    assert.equal(snap.fashnConfigured, false);
    assert.equal(snap.providers.find((p) => p.id === "llm")?.mock, true);
    assert.equal(snap.providers.find((p) => p.id === "fashion")?.mock, true);
  });
});

describe("Sprint 16.3 — failure recovery", () => {
  it("OpenAI live failure falls back to mock without crashing", async () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test";
    try {
      const provider = new OpenAIProvider({});
      await provider.initialize();
      provider.client.chatCompletion = async () => {
        throw new Error("OpenAI unavailable");
      };
      const result = await provider.execute("hello", { mode: "chat" });
      assert.ok(result.content);
      assert.equal(result.fallbackUsed, true);
      assert.equal(result.displayBrand, "YEBO AI");
    } finally {
      if (prev === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prev;
    }
  });

  it("FASHN live failure throws for credit rollback path", async () => {
    const prev = process.env.FASHN_API_KEY;
    process.env.FASHN_API_KEY = "fashn-test";
    try {
      const provider = new FashionProvider({});
      await provider.initialize();
      provider.client.startTryOn = async () => {
        const err = new Error("FASHN unavailable");
        err.code = "GENERATION_FAILED";
        throw err;
      };
      await assert.rejects(
        () =>
          provider.execute(
            JSON.stringify({
              inputs: {
                personImage: "https://cdn.example.com/person.jpg",
                garmentImage: "https://cdn.example.com/garment.jpg",
              },
            }),
            { previewType: AI_PREVIEW_TYPE.BODY_TRYON }
          ),
        /FASHN unavailable/
      );
    } finally {
      if (prev === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = prev;
    }
  });

  it("invalid try-on images return validation error without crash", async () => {
    const prev = process.env.FASHN_API_KEY;
    process.env.FASHN_API_KEY = "fashn-test";
    try {
      const provider = new FashionProvider({});
      await provider.initialize();
      await assert.rejects(
        () => provider.execute(JSON.stringify({ inputs: {} }), { previewType: AI_PREVIEW_TYPE.BODY_TRYON }),
        /person photo is required/i
      );
    } finally {
      if (prev === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = prev;
    }
  });
});

describe("Sprint 16.3 — security masking", () => {
  it("customers and vendors never see provider identifiers", () => {
    const payload = {
      providerId: "openai",
      providerName: "FASHN AI",
      model: "gpt-4o-mini",
      endpoint: "https://api.fashn.ai/v1/run",
      previewImageUrl: "https://cdn.fashn.ai/output.png",
    };
    const customer = maskForCustomer(payload);
    const vendor = maskForVendor(payload);
    assert.equal(customer.providerId, undefined);
    assert.equal(vendor.providerId, undefined);
    assert.equal(customer.model, "YEBO AI");
    assert.equal(customer.displayBrand, "YEBO AI");
    assert.equal(customer.previewImageUrl, payload.previewImageUrl);
  });

  it("super admin view retains provider metrics fields", () => {
    const admin = maskForAdmin({ providerCost: 0.04, totalInputTokens: 100 });
    assert.equal(admin.providerCost, 0.04);
    assert.equal(admin.totalInputTokens, 100);
  });
});

describe("Sprint 16.3 — analytics completeness", () => {
  it("records all required metrics for intelligence requests", async () => {
    const recorded = [];
    const platform = {
      metrics: {
        recordRequest: (e) => recorded.push({ kind: "request", e }),
        recordTokenUsage: (u) => recorded.push({ kind: "tokens", u }),
        recordProviderCost: (c) => recorded.push({ kind: "cost", c }),
      },
      analyticsPersistence: { recordEvent: async (e) => recorded.push({ kind: "persist", e }) },
    };

    await recordAnalytics(
      platform,
      analyticsFromProvider(
        { usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 }, cost: { estimatedCostUsd: 0.01 } },
        {
          type: "intelligence",
          latencyMs: 45,
          success: true,
          serviceType: AI_SERVICE.INTELLIGENCE,
          providerCategory: "llm",
          creditsUsed: 0,
        }
      )
    );

    const persist = recorded.find((r) => r.kind === "persist")?.e;
    assert.equal(persist.tokenUsage.totalTokens, 30);
    assert.equal(persist.providerCost, 0.01);
    assert.equal(persist.latencyMs, 45);
    assert.equal(persist.success, true);
    assert.equal(persist.serviceType, AI_SERVICE.INTELLIGENCE);
    assert.equal(persist.providerCategory, "llm");
  });
});

describe("Sprint 16.3 — E2E gateway flows (mock mode)", () => {
  let server;
  let port;
  let platform;

  before(async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.FASHN_API_KEY;
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app);
    app.use("/api/v2/ai", require("../../../controller/ai"));
    server = app.listen(0);
    port = server.address().port;
    platform = getAIPlatform();
    platform.metrics.reset();
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  const flows = [
    {
      name: "AI Shopping Assistant",
      path: "/api/v2/ai/chat",
      method: "POST",
      body: { message: "recommend running shoes under 50000", sessionId: "s16.3-chat" },
      assertFn: (r) => r.status === 200 && r.body?.data?.displayBrand === "YEBO AI",
    },
    {
      name: "Search by Image",
      path: "/api/v2/ai/search/image",
      method: "POST",
      body: { imageBase64: "aGVsbG8=" },
      assertFn: (r) => r.status === 200 && r.body?.data?.displayBrand === "YEBO AI",
    },
    {
      name: "Product Comparison",
      path: "/api/v2/ai/intelligence",
      method: "POST",
      body: { mode: "compare", products: [{ name: "A" }, { name: "B" }] },
      assertFn: (r) => r.status === 200 && r.body?.data?.displayBrand === "YEBO AI",
    },
    {
      name: "Budget Advisor",
      path: "/api/v2/ai/intelligence",
      method: "POST",
      body: { mode: "budget", selection: { budget: 100000 } },
      assertFn: (r) => r.status === 200,
    },
    {
      name: "Search",
      path: "/api/v2/ai/search",
      method: "POST",
      body: { query: "wireless headphones", sessionId: "s16.3-search" },
      assertFn: (r) => r.status === 200,
    },
  ];

  for (const flow of flows) {
    it(`${flow.name} completes via gateway`, async () => {
      const started = Date.now();
      const response = await requestJson({ port, path: flow.path, method: flow.method, body: flow.body });
      const latencyMs = Date.now() - started;
      assert.ok(flow.assertFn(response), `${flow.name} failed status=${response.status}`);
      assert.ok(latencyMs < 120_000, `${flow.name} exceeded timeout (${latencyMs}ms)`);
    });
  }

  it("Virtual Try-On mock path via FashionProvider", async () => {
    const registry = platform.providerRegistry;
    const router = platform.router;
    const routing = router.route({
      serviceType: AI_SERVICE.PREVIEW,
      previewType: AI_PREVIEW_TYPE.BODY_TRYON,
      input: JSON.stringify({ productId: "p1", inputs: {} }),
      options: { previewType: AI_PREVIEW_TYPE.BODY_TRYON },
    });
    const started = Date.now();
    const result = await router.execute(routing);
    const latencyMs = Date.now() - started;
    assert.equal(routing.providerId, "fashion");
    assert.equal(result.mock, true);
    assert.equal(result.displayBrand, "YEBO AI");
    assert.ok(latencyMs < 5000);
  });

  it("Description and Translation route through llm provider", async () => {
    const router = platform.router;
    for (const serviceType of ["description", "translation"]) {
      const routing = router.route({
        serviceType,
        input: "sample text",
        options: { serviceType, scope: serviceType, body: { input: "sample text" } },
      });
      assert.equal(routing.providerId, "llm");
      const result = await router.execute(routing);
      assert.ok(result.content || result.structured);
      assert.equal(result.displayBrand, "YEBO AI");
    }
  });

  it("measures gateway overhead metrics snapshot", () => {
    const snap = platform.metrics.getSnapshot();
    assert.ok(snap.requests >= 0);
    assert.ok(typeof snap.avgLatencyMs === "number");
    assert.ok(typeof snap.totalInputTokens === "number");
  });
});
