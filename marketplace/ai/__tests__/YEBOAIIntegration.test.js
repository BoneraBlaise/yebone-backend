const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const { AI_SERVICE, AI_PREVIEW_TYPE } = require("../commerce/CreditPolicy");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";

function requestJson({ port, path, method = "GET", body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = {};
          try {
            parsed = JSON.parse(data || "{}");
          } catch {
            parsed = { raw: data };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createTestApp() {
  const app = express();
  app.use(express.json());
  registerMarketplaceCore(app);
  const ai = require("../../../controller/ai");
  app.use("/api/v2/ai", ai);
  return app;
}

describe("YEBO AI Foundation — HTTP integration", () => {
  let server;
  let port;
  let mongoAvailable = false;

  before(async () => {
    if (mongoose.connection.readyState === 1) {
      mongoAvailable = true;
    } else {
      const uri = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGO_URI;
      if (uri) {
        try {
          await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
          mongoAvailable = mongoose.connection.readyState === 1;
        } catch {
          mongoAvailable = false;
        }
      }
    }

    const app = createTestApp();
    server = app.listen(0);
    port = server.address().port;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoAvailable && mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
  });

  it("POST /ai/intelligence returns masked YEBO AI response", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/intelligence",
      method: "POST",
      body: { mode: "tips" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.displayBrand, "YEBO AI");
    assert.equal(response.body.data.providerId, undefined);
  });

  it("POST /ai/preview rejects missing vendorId", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/preview",
      method: "POST",
      body: {
        ai_preview_type: AI_PREVIEW_TYPE.BODY_TRYON,
        productId: "missing-product",
      },
    });
    assert.ok([400, 403, 404].includes(response.status));
    assert.equal(response.body.displayBrand, "YEBO AI");
  });

  it("GET /ai/preview/:id returns 404 for unknown session", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const response = await requestJson({
      port,
      path: "/api/v2/ai/preview/00000000-0000-4000-8000-000000000000",
    });
    assert.equal(response.status, 404);
    assert.equal(response.body.displayBrand, "YEBO AI");
  });

  it("POST /ai/chat masks provider details from customers", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/chat",
      method: "POST",
      body: { message: "find white sneakers", sessionId: "integration-chat" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.displayBrand, "YEBO AI");
    assert.equal(response.body.data.provider, undefined);
    assert.ok(response.body.data.yeboAI || response.body.data.message);
  });

  it("POST /ai/search returns search intent through gateway", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/search",
      method: "POST",
      body: { query: "laptops under 500000" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.intent, "search");
    assert.equal(response.body.data.displayBrand, "YEBO AI");
  });

  it("GET /ai/vendor/dashboard requires seller auth", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/vendor/dashboard",
    });
    assert.ok([401, 403].includes(response.status));
  });

  it("GET /ai/vendor/credits requires seller auth", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/vendor/credits",
    });
    assert.ok([401, 403].includes(response.status));
  });

  it("GET /ai/vendor/subscription requires seller auth", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/ai/vendor/subscription",
    });
    assert.ok([401, 403].includes(response.status));
  });

  it("GET /marketplace/ai/admin/analytics requires authentication", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/marketplace/ai/admin/analytics",
    });
    assert.ok([401, 403].includes(response.status));
  });

  it("POST /marketplace/ai/admin/credits/adjust requires authentication", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/marketplace/ai/admin/credits/adjust",
      method: "POST",
      body: { vendorId: "vendor_test", amount: 5 },
    });
    assert.ok([401, 403].includes(response.status));
  });

  it("public health endpoint masks provider registry", async () => {
    const response = await requestJson({
      port,
      path: "/api/v2/marketplace/ai/health",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.displayBrand, "YEBO AI");
    assert.equal(response.body.data.providers.yebo_ai.displayBrand, "YEBO AI");
    assert.equal(response.body.data.mockProviderActive, false);
  });

  it("planner routes through AIRouter when platform initialized", () => {
    const core = new MarketplaceCore();
    const { AIPlatform } = require("../index");
    const platform = new AIPlatform({ marketplaceCore: core });
    platform.initialize();
    assert.ok(platform.router);
    assert.ok(platform.planner.router);
    assert.equal(platform.planner.router, platform.router);
  });
});
