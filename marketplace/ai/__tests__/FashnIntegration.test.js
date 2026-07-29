const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const FashnConfiguration = require("../providers/fashn/FashnConfiguration");
const { validateTryOnImages } = require("../providers/fashn/FashnImageValidator");
const { estimateCostUsd } = require("../providers/fashn/FashnCostEstimator");
const FashionProvider = require("../providers/contracts/FashionProvider");
const AIProviderRegistry = require("../providers/AIProviderRegistry");
const AIRouter = require("../router/AIRouter");
const { AI_PREVIEW_TYPE, AI_SERVICE } = require("../commerce/CreditPolicy");
const { maskForCustomer } = require("../utils/ProviderMasking");
const { analyticsFromProvider } = require("../analytics/AIAnalyticsRecorder");
const { registerMarketplaceCore } = require("../../index");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";

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

describe("Sprint 16.2 — FASHN configuration", () => {
  it("reads env vars without hardcoding credentials", () => {
    const config = new FashnConfiguration({ apiKey: "test-key", baseURL: "https://api.fashn.ai" });
    assert.equal(config.isConfigured(), true);
    assert.equal(config.publicModelAlias, "yebo-tryon-v1");
  });

  it("estimates provider cost for analytics", () => {
    const cost = estimateCostUsd("tryon-v1.6", { creditsUsed: 1 });
    assert.ok(cost.estimatedCostUsd > 0);
  });
});

describe("Sprint 16.2 — image validation", () => {
  it("requires person and garment images for live try-on", () => {
    const missing = validateTryOnImages({});
    assert.equal(missing.ok, false);
    assert.equal(missing.code, "PERSON_IMAGE_REQUIRED");

    const valid = validateTryOnImages({
      personImage: "https://cdn.example.com/person.jpg",
      garmentImage: "https://cdn.example.com/garment.jpg",
    });
    assert.equal(valid.ok, true);
  });
});

describe("Sprint 16.2 — FashionProvider mock fallback", () => {
  it("uses mock when FASHN_API_KEY is unset", async () => {
    const previous = process.env.FASHN_API_KEY;
    delete process.env.FASHN_API_KEY;

    try {
      const provider = new FashionProvider({});
      await provider.initialize();
      assert.equal(provider.isLive, false);
      const result = await provider.execute(JSON.stringify({ productId: "p1" }), {
        previewType: AI_PREVIEW_TYPE.BODY_TRYON,
      });
      assert.equal(result.mock, true);
      assert.equal(result.displayBrand, "YEBO AI");
      assert.equal(result.imageGeneration, false);
    } finally {
      if (previous === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = previous;
    }
  });

  it("registry reports fashion provider configured when key is set", async () => {
    const previous = process.env.FASHN_API_KEY;
    process.env.FASHN_API_KEY = "test-key";
    try {
      const registry = new AIProviderRegistry();
      await registry.initializeAll();
      const snapshot = registry.getSnapshot();
      assert.equal(snapshot.fashnConfigured, true);
      const fashion = snapshot.providers.find((p) => p.id === "fashion");
      assert.equal(fashion?.configured, true);
    } finally {
      if (previous === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = previous;
    }
  });

  it("router routes body_tryon to fashion provider", async () => {
    delete process.env.FASHN_API_KEY;
    const registry = new AIProviderRegistry();
    await registry.initializeAll();
    const router = new AIRouter(registry);
    const routing = router.route({
      serviceType: AI_SERVICE.PREVIEW,
      previewType: AI_PREVIEW_TYPE.BODY_TRYON,
      input: "{}",
    });
    assert.equal(routing.providerId, "fashion");
  });
});

describe("Sprint 16.2 — live generation with mocked FASHN client", () => {
  it("returns masked YEBO AI result image on success", async () => {
    const previous = process.env.FASHN_API_KEY;
    process.env.FASHN_API_KEY = "test-key";

    try {
      const provider = new FashionProvider({});
      await provider.initialize();

      provider.client.startTryOn = async () => ({
        predictionId: "pred-1",
        status: "completed",
        previewImageUrl: "https://cdn.fashn.ai/output.png",
        output: ["https://cdn.fashn.ai/output.png"],
        generationDurationMs: 8200,
        creditsUsed: 1,
        cost: estimateCostUsd("tryon-v1.6", { creditsUsed: 1 }),
      });

      const result = await provider.execute(
        JSON.stringify({
          productId: "p1",
          inputs: {
            personImage: "https://cdn.example.com/person.jpg",
            garmentImage: "https://cdn.example.com/garment.jpg",
          },
        }),
        { previewType: AI_PREVIEW_TYPE.BODY_TRYON, productImageUrl: "https://cdn.example.com/garment.jpg" }
      );

      assert.equal(result.mock, false);
      assert.equal(result.imageGeneration, true);
      assert.ok(result.previewImageUrl.includes("cdn.fashn.ai"));

      const masked = maskForCustomer({
        session: {
          previewImageUrl: result.previewImageUrl,
          displayBrand: "YEBO AI",
        },
      });
      assert.equal(masked.displayBrand, "YEBO AI");
      assert.ok(masked.session.previewImageUrl.includes("cdn.fashn.ai"));
      assert.equal(masked.session.providerId, undefined);
    } finally {
      if (previous === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = previous;
    }
  });

  it("throws on failed generation so credits can roll back", async () => {
    const previous = process.env.FASHN_API_KEY;
    process.env.FASHN_API_KEY = "test-key";

    try {
      const provider = new FashionProvider({});
      await provider.initialize();
      provider.client.startTryOn = async () => {
        const err = new Error("Generation failed");
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
        /Generation failed/
      );
    } finally {
      if (previous === undefined) delete process.env.FASHN_API_KEY;
      else process.env.FASHN_API_KEY = previous;
    }
  });
});

describe("Sprint 16.2 — analytics", () => {
  it("records provider cost and generation duration", () => {
    const event = analyticsFromProvider(
      { cost: { estimatedCostUsd: 0.04, creditsUsed: 1 } },
      {
        type: "preview",
        latencyMs: 9100,
        success: true,
        serviceType: AI_PREVIEW_TYPE.BODY_TRYON,
        providerCategory: "fashion",
        creditsUsed: 1,
      }
    );
    assert.equal(event.providerCost, 0.04);
    assert.equal(event.creditsUsed, 1);
  });
});

describe("Sprint 16.2 — provider masking", () => {
  it("masks FASHN identifiers from customers but preserves image URLs", () => {
    const masked = maskForCustomer({
      providerId: "fashion",
      providerName: "FASHN AI",
      message: "Powered by FASHN",
      previewImageUrl: "https://cdn.fashn.ai/output.png",
    });
    assert.equal(masked.displayBrand, "YEBO AI");
    assert.equal(masked.providerId, undefined);
    assert.equal(masked.message, "YEBO AI");
    assert.equal(masked.previewImageUrl, "https://cdn.fashn.ai/output.png");
  });
});

describe("Sprint 16.2 — HTTP preview endpoints", () => {
  let server;
  let port;
  let mongoAvailable = false;

  before(async () => {
    delete process.env.FASHN_API_KEY;
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

  it("POST /ai/preview validates missing product", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const response = await requestJson({
      port,
      path: "/api/v2/ai/preview",
      method: "POST",
      body: { ai_preview_type: AI_PREVIEW_TYPE.BODY_TRYON, vendorId: "vendor-1" },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, "PRODUCT_REQUIRED");
  });

  it("GET /ai/preview/:sessionId returns 404 for unknown session", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const response = await requestJson({
      port,
      path: "/api/v2/ai/preview/00000000-0000-4000-8000-000000000000",
      method: "GET",
    });
    assert.equal(response.status, 404);
  });
});
