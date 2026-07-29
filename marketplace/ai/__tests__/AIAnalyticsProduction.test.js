const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  analyticsFromProvider,
  recordAnalytics,
  stripProviderAnalytics,
} = require("../analytics/AIAnalyticsRecorder");
const AIAnalyticsPersistence = require("../analytics/AIAnalyticsPersistence");

describe("Sprint 16.1 — AI analytics recorder", () => {
  it("builds token and cost fields from provider result", () => {
    const event = analyticsFromProvider(
      {
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        cost: { estimatedCostUsd: 0.0025 },
        providerCategory: "llm",
      },
      {
        type: "chat",
        latencyMs: 42,
        success: true,
        serviceType: "shopping_assistant",
      }
    );

    assert.equal(event.providerCost, 0.0025);
    assert.deepEqual(event.tokenUsage, {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
    assert.equal(event.latencyMs, 42);
    assert.equal(event.success, true);
    assert.equal(event.serviceType, "shopping_assistant");
  });

  it("records runtime metrics and persistence events", async () => {
    const recorded = [];
    const platform = {
      metrics: {
        recordRequest: (event) => recorded.push({ kind: "request", event }),
        recordTokenUsage: (usage) => recorded.push({ kind: "tokens", usage }),
        recordProviderCost: (cost) => recorded.push({ kind: "cost", cost }),
      },
      analyticsPersistence: {
        recordEvent: async (event) => {
          recorded.push({ kind: "persist", event });
        },
      },
    };

    await recordAnalytics(
      platform,
      analyticsFromProvider(
        { usage: { inputTokens: 10, outputTokens: 5 } },
        {
          type: "intelligence",
          latencyMs: 12,
          success: true,
          serviceType: "intelligence",
          providerCategory: "llm",
        }
      )
    );

    assert.equal(recorded.length, 3);
    assert.equal(recorded[0].kind, "request");
    assert.equal(recorded[1].kind, "tokens");
    assert.equal(recorded[2].kind, "persist");
    assert.equal(recorded[2].event.tokenUsage.totalTokens, 15);
  });

  it("strips internal provider analytics before customer responses", () => {
    const stripped = stripProviderAnalytics({
      message: "hello",
      _providerAnalytics: { usage: { inputTokens: 1 } },
    });
    assert.equal(stripped.message, "hello");
    assert.equal(stripped._providerAnalytics, undefined);
  });
});

describe("Sprint 16.1 — future readiness", () => {
  it("switches registry to live providers when OPENAI_API_KEY is set", async () => {
    const previous = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-key";
    try {
      const registry = new (require("../providers/AIProviderRegistry"))();
      await registry.initializeAll();
      const snapshot = registry.getSnapshot();
      assert.equal(snapshot.openaiConfigured, true);
      assert.equal(snapshot.providers.find((p) => p.id === "llm")?.configured, true);
      assert.equal(snapshot.providers.find((p) => p.id === "vision")?.configured, true);
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }
  });
});

describe("Sprint 16.1 — analytics persistence token fields", () => {
  it("accepts tokenUsage without breaking legacy callers", async () => {
    const persistence = new AIAnalyticsPersistence();
    let captured = null;

    persistence.recordEvent = async (event) => {
      captured = event;
    };

    await persistence.recordEvent({
      serviceType: "shopping_assistant",
      latencyMs: 20,
      success: true,
      providerCategory: "llm",
      creditsUsed: 0,
      providerCost: 0,
      tokenUsage: { inputTokens: 8, outputTokens: 4, totalTokens: 12 },
    });

    assert.deepEqual(captured.tokenUsage, {
      inputTokens: 8,
      outputTokens: 4,
      totalTokens: 12,
    });

    captured = null;
    await persistence.recordEvent({
      serviceType: "search",
      latencyMs: 10,
      success: true,
    });

    assert.equal(captured.serviceType, "search");
    assert.equal(captured.tokenUsage, undefined);
  });
});
