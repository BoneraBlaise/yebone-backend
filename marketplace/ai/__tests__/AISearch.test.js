const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const SearchParameterExtractor = require("../search/SearchParameterExtractor");
const SearchTool = require("../tools/SearchTool");
const { AIPlanner, AIPromptRegistry, AIProviderManager } = require("../index");

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

describe("AI Search — Phase 7.3", () => {
  const extractor = new SearchParameterExtractor();

  it("extracts English natural language search parameters", () => {
    const result = extractor.extract("Show me Samsung phones under 300000 RWF");
    assert.equal(result.language, "en");
    assert.equal(result.brand, "Samsung");
    assert.equal(result.category, "phones");
    assert.equal(result.maxPrice, 300000);
    assert.ok(result.q);
  });

  it("extracts Kinyarwanda natural language search parameters", () => {
    const result = extractor.extract("Nshakira laptop ya Dell ifite RAM 16GB");
    assert.ok(["rw", "mixed"].includes(result.language));
    assert.equal(result.brand, "Dell");
    assert.equal(result.category, "laptops");
    assert.match(result.q.toLowerCase(), /ram|16gb|laptop/);
  });

  it("extracts mixed-language search parameters", () => {
    const result = extractor.extract("Mfasha kubona TV nziza iri munsi ya 500,000");
    assert.ok(["rw", "mixed"].includes(result.language));
    assert.equal(result.category, "tv");
    assert.equal(result.maxPrice, 500000);
  });

  it("extracts price bounds and sort hints", () => {
    const result = extractor.extract("Find laptops between 200000 and 450000 RWF cheapest");
    assert.equal(result.minPrice, 200000);
    assert.equal(result.maxPrice, 450000);
    assert.equal(result.sort, "priceLowToHigh");
  });

  it("extracts brand and category from English product query", () => {
    const result = extractor.extract("Find black Nike shoes size 42");
    assert.equal(result.brand, "Nike");
    assert.equal(result.category, "shoes");
    assert.match(result.q.toLowerCase(), /black|size|42/);
  });

  it("rejects empty natural language queries", () => {
    assert.throws(() => extractor.extract("   "), (err) => err.code === "EMPTY_QUERY");
  });

  it("rejects invalid natural language queries with no searchable terms", () => {
    assert.throws(() => extractor.extract("please help me"), (err) => err.code === "INVALID_QUERY");
  });

  it("SearchTool forwards structured params to SearchPlatform without local filtering", async () => {
    let captured = null;
    const searchPlatform = {
      searchProducts: async (query) => {
        captured = query;
        return { products: [], meta: { count: 0, empty: true } };
      },
    };
    const tool = new SearchTool({ searchPlatform }).initialize();
    const structured = extractor.extract("Show me Samsung phones under 300000 RWF");
    await tool.run({ action: "keyword", ...structured });

    assert.equal(captured.brand, "Samsung");
    assert.equal(captured.category, "phones");
    assert.equal(captured.maxPrice, 300000);
    assert.ok(captured.q);
  });

  it("planner attaches structured searchRequest to search plans", async () => {
    const planner = new AIPlanner({
      toolRegistry: { checkPermission: () => ({ allowed: true }) },
      capabilityRegistry: {
        resolveIntent: () => ({ toolId: "search.products", matchedCapabilities: ["keyword"], score: 1 }),
      },
      promptRegistry: new AIPromptRegistry(),
      providerManager: new AIProviderManager({ primaryProvider: "mock" }),
      hooks: { emit: async () => {} },
      metrics: {
        recordPlannerDecision: () => {},
        recordSearchExtraction: () => {},
        recordConversationTurn: () => {},
      },
      config: {},
    });

    const plan = await planner.createPlan({
      requestId: "req-search-1",
      message: "Find black Nike shoes size 42",
      type: "search",
    });

    assert.equal(plan.toolId, "search.products");
    assert.equal(plan.searchRequest.brand, "Nike");
    assert.equal(plan.searchRequest.category, "shoes");
  });

  it("search gateway returns structured searchRequest and SearchPlatform delegation", async () => {
    const app = express();
    app.use(express.json());
    const { registerMarketplaceCore } = require("../../index");
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await postJson(port, "/api/v2/ai/search", {
      query: "Show me Samsung phones under 300000 RWF",
    });

    server.close();
    assert.equal(response.status, 200);
    assert.equal(response.body.data.intent, "search");
    assert.equal(response.body.data.searchRequest.brand, "Samsung");
    assert.equal(response.body.data.searchRequest.maxPrice, 300000);
    assert.equal(typeof response.body.data.tool.success, "boolean");
    assert.equal(response.body.data.meta.phase, "7.5");
  });

  it("search gateway rejects empty query", async () => {
    const app = express();
    app.use(express.json());
    const { registerMarketplaceCore } = require("../../index");
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();
    const response = await postJson(port, "/api/v2/ai/search", { query: "   " });
    server.close();

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });
});
