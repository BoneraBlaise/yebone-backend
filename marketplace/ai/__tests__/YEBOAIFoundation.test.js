const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const AIRouter = require("../router/AIRouter");
const AIProviderRegistry = require("../providers/AIProviderRegistry");
const { getCreditCost, AI_SERVICE, AI_PREVIEW_TYPE } = require("../commerce/CreditPolicy");
const VendorCreditsService = require("../commerce/VendorCreditsService");
const VendorAISubscriptionService = require("../commerce/VendorAISubscriptionService");
const AIEntitlementsService = require("../commerce/AIEntitlementsService");
const { maskForCustomer, maskForVendor } = require("../utils/ProviderMasking");

describe("YEBO AI Foundation — production architecture", () => {
  it("routes fashion try-on to fashion provider", async () => {
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

  it("routes wall preview to interior placement provider", async () => {
    const registry = new AIProviderRegistry();
    await registry.initializeAll();
    const router = new AIRouter(registry);
    const routing = router.route({
      serviceType: AI_SERVICE.PREVIEW,
      previewType: AI_PREVIEW_TYPE.WALL_PREVIEW,
      input: "{}",
    });
    assert.equal(routing.providerId, "interior_placement");
  });

  it("routes shopping assistant to llm provider", async () => {
    const registry = new AIProviderRegistry();
    await registry.initializeAll();
    const router = new AIRouter(registry);
    const routing = router.route({ serviceType: AI_SERVICE.SHOPPING_ASSISTANT, input: "hello" });
    assert.equal(routing.providerId, "llm");
  });

  it("applies credit policy for preview types", () => {
    assert.equal(getCreditCost(AI_SERVICE.PREVIEW, AI_PREVIEW_TYPE.BODY_TRYON), 1);
    assert.equal(getCreditCost(AI_SERVICE.PREVIEW, AI_PREVIEW_TYPE.ROOM_PREVIEW), 2);
    assert.equal(getCreditCost(AI_SERVICE.SEARCH), 0);
  });

  it("masks provider names from customer payloads", () => {
    const masked = maskForCustomer({
      providerId: "openai",
      message: "Powered by OpenAI",
      nested: { provider: "gemini" },
    });
    assert.equal(masked.displayBrand, "YEBO AI");
    assert.equal(masked.providerId, undefined);
    assert.equal(masked.message, "YEBO AI");
  });

  it("masks provider names from vendor payloads", () => {
    const masked = maskForVendor({ providers: { openai: { active: true } } });
    assert.equal(masked.providers.yebo_ai.displayBrand, "YEBO AI");
  });
});

describe("YEBO AI Foundation — MongoDB ledger", () => {
  let mongoAvailable = false;

  before(async () => {
    if (mongoose.connection.readyState === 1) {
      mongoAvailable = true;
      return;
    }
    const uri = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGO_URI;
    if (!uri) return;
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      mongoAvailable = mongoose.connection.readyState === 1;
    } catch {
      mongoAvailable = false;
    }
  });

  after(async () => {
    if (mongoAvailable && mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect().catch(() => {});
    }
  });

  it("creates subscription and wallet for new vendor", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const subs = new VendorAISubscriptionService();
    const sub = await subs.ensureSubscription("vendor_test_1");
    assert.ok(sub);
    assert.equal(sub.vendorId, "vendor_test_1");
    assert.ok(subs.isActive(sub));

    const credits = new VendorCreditsService();
    const wallet = await credits.getWalletSnapshot("vendor_test_1");
    assert.ok(wallet.remainingCredits >= 0);
  });

  it("deducts credits atomically and supports idempotency", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const subs = new VendorAISubscriptionService();
    await subs.ensureSubscription("vendor_test_2");
    const credits = new VendorCreditsService();
    await credits.allocateMonthly("vendor_test_2", 10);

    const first = await credits.consumeCredits("vendor_test_2", 1, {
      idempotencyKey: "idem-test-1",
      serviceType: "body_tryon",
    });
    assert.equal(first.ok, true);
    assert.equal(first.creditsConsumed, 1);

    const duplicate = await credits.consumeCredits("vendor_test_2", 1, {
      idempotencyKey: "idem-test-1",
      serviceType: "body_tryon",
    });
    assert.equal(duplicate.duplicate, true);

    const wallet = await credits.getWalletSnapshot("vendor_test_2");
    assert.equal(wallet.remainingCredits, 9);
  });

  it("rolls back credits on provider failure path", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const subs = new VendorAISubscriptionService();
    await subs.ensureSubscription("vendor_test_3");
    const credits = new VendorCreditsService();
    await credits.allocateMonthly("vendor_test_3", 5);

    const debit = await credits.consumeCredits("vendor_test_3", 2, { serviceType: "preview" });
    assert.equal(debit.ok, true);

    const rollback = await credits.rollbackConsumption(debit.transactionId);
    assert.equal(rollback.ok, true);

    const wallet = await credits.getWalletSnapshot("vendor_test_3");
    assert.equal(wallet.remainingCredits, 5);
  });

  it("executes paid service through entitlements layer", async (t) => {
    if (!mongoAvailable) return t.skip("MongoDB not available");
    const entitlements = new AIEntitlementsService();
    await entitlements.subscriptions.ensureSubscription("vendor_test_4");
    await entitlements.credits.allocateMonthly("vendor_test_4", 10);

    const result = await entitlements.executeWithCredits("vendor_test_4", {
      serviceType: AI_SERVICE.PREVIEW,
      previewType: AI_PREVIEW_TYPE.FACE_TRYON,
      idempotencyKey: "exec-idem-1",
      executeFn: async () => ({ status: "orchestrated", displayBrand: "YEBO AI" }),
    });

    assert.equal(result.ok, true);
    assert.equal(result.creditsConsumed, 1);
    assert.equal(result.result.status, "orchestrated");
  });
});
