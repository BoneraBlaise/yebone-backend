const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const PropertyMobilityPlatform = require("../../property-mobility/PropertyMobilityPlatform");
const SellerOperationsPlatform = require("../../seller-operations/SellerOperationsPlatform");
const GrowthCommercePlatform = require("../../growth-commerce/GrowthCommercePlatform");
const { AIPlatform } = require("../index");
const AIConfiguration = require("../AIConfiguration");
const AIPendingActionService = require("../confirmation/AIPendingActionService");
const ConfirmationHandler = require("../confirmation/ConfirmationHandler");
const { AIActionAudit } = require("../audit/AIActionAudit");
const {
  PropertySearchTool,
  PropertyListingGetTool,
  GrowthRecommendTool,
  SellerInventoryTool,
  PropertyListingManageTool,
} = require("../tools/registerTools");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret";
process.env.AI_CONFIRMATION_SECRET = "test-commerce-confirmation-secret";

function postJson(port, path, body, headers = {}) {
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
          ...headers,
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

function createCommercePlatforms() {
  const propertyMobility = new PropertyMobilityPlatform({ useMemoryOnly: true });
  const sellerOperations = new SellerOperationsPlatform({ useMemoryOnly: true });
  const growthCommerce = new GrowthCommercePlatform({ useMemoryOnly: true });
  return { propertyMobility, sellerOperations, growthCommerce };
}

function createStubCorePlatforms() {
  return {
    search: {
      searchProducts: async () => ({
        products: [{ _id: "p1", name: "Stub Product", discountPrice: 1000 }],
        meta: { count: 1, empty: false },
      }),
      searchShops: async () => ({ shops: [], meta: { count: 0, empty: true } }),
      suggest: async () => ({ suggestions: ["stub"] }),
      listCategories: async () => ({ categories: ["Electronics"], meta: { count: 1 } }),
      searchService: {},
    },
    product: {
      catalog: {
        getById: async () => ({
          _id: "p1",
          name: "Stub Product",
          discountPrice: 1000,
          stock: 5,
        }),
        listByShop: async () => [],
      },
      pricing: {
        getSummary: (product) => ({
          discountPrice: product.discountPrice,
          originalPrice: null,
          hasDiscount: false,
          currency: "RWF",
        }),
      },
      analytics: { getSummary: () => ({ lifecycleState: "active" }) },
    },
    vendor: {
      profile: {
        getPublicInfo: async () => ({ _id: "s1", name: "Stub Shop", isVerified: true }),
      },
      analytics: { getBasicSummary: () => ({ shopId: "s1", isVerified: true }) },
    },
    order: {
      history: {
        listForUser: async () => [{ _id: "o1", status: "Processing", user: { _id: "u1" }, cart: [] }],
        getById: async () => ({
          _id: "o1",
          status: "Processing",
          user: { _id: "u1" },
          cart: [],
          paymentInfo: { status: "Pending" },
        }),
      },
      status: {
        getSummary: () => ({ status: "Processing", phase: "fulfillment" }),
        getFulfillmentOptions: () => ["Delivered"],
      },
    },
    ...createCommercePlatforms(),
  };
}

function createCommercePlatform() {
  const core = new MarketplaceCore();
  const platform = new AIPlatform({ marketplaceCore: core });
  platform.providerManager.initializeAll();
  platform.toolRegistry.registerProductionTools({
    marketplaceCore: core,
    platforms: createStubCorePlatforms(),
  });
  platform.capabilityRegistry.registerFromTools([...platform.toolRegistry.tools.values()]);
  platform._initialized = true;
  return platform;
}

describe("Commerce Agent — Phase 13", () => {
  let auditEvents;

  beforeEach(() => {
    auditEvents = [];
  });

  function createAudit() {
    const audit = new AIActionAudit({ enabled: true });
    const original = audit._record.bind(audit);
    audit._record = (action, payload) => {
      auditEvents.push({ action, payload });
      return original(action, payload);
    };
    return audit;
  }

  it("registers five commerce tools alongside existing eight tools", () => {
    const platform = createCommercePlatform();
    const ids = platform.toolRegistry.list().map((tool) => tool.id);
    assert.equal(ids.length, 13);
    assert.ok(ids.includes("property.search"));
    assert.ok(ids.includes("property.listing.get"));
    assert.ok(ids.includes("growth.recommend"));
    assert.ok(ids.includes("seller.inventory.read"));
    assert.ok(ids.includes("property.listing.manage"));
  });

  it("PropertySearchTool delegates to PropertyMobilitySearchBridge", async () => {
    const { propertyMobility } = createCommercePlatforms();
    await propertyMobility.listingService.createListing("owner_1", {
      category: "apartments",
      title: "Kigali Apartment",
      description: "Nice place",
      price: 500000,
      location: { city: "Kigali" },
    });
    const tool = new PropertySearchTool({ searchBridge: propertyMobility.searchBridge }).initialize();
    const result = await tool.run({ q: "apartment in Kigali", message: "apartment in Kigali" });
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data.listings) || Array.isArray(result.data.results));
  });

  it("PropertyListingGetTool reads via ListingService.getPublicListing", async () => {
    const { propertyMobility } = createCommercePlatforms();
    const created = await propertyMobility.listingService.createListing("owner_1", {
      category: "houses",
      title: "House",
      description: "Spacious",
      price: 1000000,
      location: { city: "Kigali" },
    });
    await propertyMobility.listingService.updateListing("owner_1", created.listingId, {
      status: "published",
    });
    const tool = new PropertyListingGetTool({
      listingService: propertyMobility.listingService,
    }).initialize();
    const result = await tool.run({ listingId: created.listingId });
    assert.equal(result.success, true);
    assert.equal(result.data.listing.listingId, created.listingId);
  });

  it("GrowthRecommendTool delegates to GrowthCommerceAIService.recommend", async () => {
    const { growthCommerce } = createCommercePlatforms();
    const tool = new GrowthRecommendTool({ growthCommerceAI: growthCommerce.aiService }).initialize();
    const result = await tool.run({ limit: 3, message: "flash sale" });
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data.recommendations) || result.data.campaigns);
  });

  it("SellerInventoryTool requires vendor scope", async () => {
    const { sellerOperations } = createCommercePlatforms();
    const tool = new SellerInventoryTool({
      inventoryService: sellerOperations.inventoryService,
    }).initialize();
    const denied = await tool.run({ action: "list" }, { vendorId: null });
    assert.equal(denied.success, false);

    const allowed = await tool.run({ action: "list" }, { vendorId: "vendor_1" });
    assert.equal(allowed.success, true);
    assert.ok(Array.isArray(allowed.data.inventory));
  });

  it("PropertyListingManageTool blocks direct mutation", async () => {
    const { propertyMobility } = createCommercePlatforms();
    const tool = new PropertyListingManageTool({
      listingService: propertyMobility.listingService,
    }).initialize();
    const blocked = await tool.run(
      { action: "create_draft", title: "Draft", category: "apartments" },
      { vendorId: "vendor_1" }
    );
    assert.equal(blocked.success, false);
    assert.equal(blocked.error.code, "MUTATION_REQUIRES_CONFIRMATION");
  });

  it("permission matrix supports public, authenticated, and vendor scopes", () => {
    const platform = createCommercePlatform();
    const registry = platform.toolRegistry;

    const publicTool = registry.checkPermission("property.search", {});
    assert.equal(publicTool.allowed, true);

    const vendorDenied = registry.checkPermission("seller.inventory.read", { userId: "u1" });
    assert.equal(vendorDenied.allowed, false);

    const vendorAllowed = registry.checkPermission("seller.inventory.read", { vendorId: "v1" });
    assert.equal(vendorAllowed.allowed, true);
  });

  it("planner returns confirmation_required for write intents without executing tool", async () => {
    const platform = createCommercePlatform();
    let executed = false;
    const originalExecute = platform.toolRegistry.execute.bind(platform.toolRegistry);
    platform.toolRegistry.execute = async (...args) => {
      executed = true;
      return originalExecute(...args);
    };

    const plan = await platform.planner.createPlan({
      requestId: "req-write-1",
      sessionId: "sess-write-1",
      message: "create a listing for my apartment in Kigali 500000 rwf",
      type: "chat",
      vendorId: "vendor_1",
      role: "vendor",
    });

    assert.equal(plan.requiresConfirmation, true);
    assert.equal(plan.toolId, "property.listing.manage");

    const response = await platform.planner.execute(plan, {
      message: plan.intent.message,
      sessionId: plan.sessionId,
      vendorId: "vendor_1",
      userId: null,
      role: "vendor",
    });

    assert.equal(executed, false);
    assert.equal(response.type, "confirmation_required");
    assert.ok(response.pendingAction.pendingActionId);
    assert.ok(response.pendingAction.actionChecksum);
    assert.ok(response.pendingAction.expiresAt);
  });

  it("confirmation handler executes write after valid confirm triplet", async () => {
    const platform = createCommercePlatform();
    const audit = createAudit();
    platform.pendingActionService.audit = audit;
    platform.confirmationHandler.audit = audit;

    const plan = await platform.planner.createPlan({
      requestId: "req-write-2",
      sessionId: "sess-write-2",
      message: "create a listing for my house in Kigali 800000 rwf",
      type: "chat",
      vendorId: "vendor_confirm",
      role: "vendor",
    });
    const pending = await platform.planner.execute(plan, {
      message: plan.intent.message,
      sessionId: plan.sessionId,
      vendorId: "vendor_confirm",
      role: "vendor",
    });

    const { record, toolResult } = await platform.confirmationHandler.validateAndExecute({
      confirmActionId: pending.pendingAction.pendingActionId,
      sessionId: pending.sessionId,
      actionChecksum: pending.pendingAction.actionChecksum,
      authContext: { userId: null, vendorId: "vendor_confirm", role: "vendor" },
      correlationId: "req-write-2",
    });

    assert.equal(record.status, "consumed");
    assert.equal(toolResult.success, true);
    assert.ok(auditEvents.some((entry) => entry.action === "AI_ACTION_REQUESTED"));
    assert.ok(auditEvents.some((entry) => entry.action === "AI_ACTION_CONFIRMED"));
    assert.ok(auditEvents.some((entry) => entry.action === "AI_ACTION_EXECUTED"));
  });

  it("rejects replay after pending action is consumed", async () => {
    const platform = createCommercePlatform();
    const plan = await platform.planner.createPlan({
      requestId: "req-replay",
      sessionId: "sess-replay",
      message: "create a listing for my apartment 400000 rwf",
      type: "chat",
      vendorId: "vendor_replay",
      role: "vendor",
    });
    const pending = await platform.planner.execute(plan, {
      sessionId: plan.sessionId,
      vendorId: "vendor_replay",
      role: "vendor",
    });

    await platform.confirmationHandler.validateAndExecute({
      confirmActionId: pending.pendingAction.pendingActionId,
      sessionId: pending.sessionId,
      actionChecksum: pending.pendingAction.actionChecksum,
      authContext: { vendorId: "vendor_replay", role: "vendor" },
    });

    await assert.rejects(
      () =>
        platform.confirmationHandler.validateAndExecute({
          confirmActionId: pending.pendingAction.pendingActionId,
          sessionId: pending.sessionId,
          actionChecksum: pending.pendingAction.actionChecksum,
          authContext: { vendorId: "vendor_replay", role: "vendor" },
        }),
      (error) => error.reason === "REPLAY_DETECTED"
    );
  });

  it("rejects checksum mismatch", async () => {
    const platform = createCommercePlatform();
    const plan = await platform.planner.createPlan({
      requestId: "req-checksum",
      sessionId: "sess-checksum",
      message: "create a listing for my apartment 300000 rwf",
      type: "chat",
      vendorId: "vendor_checksum",
      role: "vendor",
    });
    const pending = await platform.planner.execute(plan, {
      sessionId: plan.sessionId,
      vendorId: "vendor_checksum",
      role: "vendor",
    });

    await assert.rejects(
      () =>
        platform.confirmationHandler.validateAndExecute({
          confirmActionId: pending.pendingAction.pendingActionId,
          sessionId: pending.sessionId,
          actionChecksum: "bad-checksum",
          authContext: { vendorId: "vendor_checksum", role: "vendor" },
        }),
      (error) => error.reason === "CHECKSUM_MISMATCH"
    );
  });

  it("expires pending actions after TTL", async () => {
    const config = new AIConfiguration({ pendingActionTtlMs: 1, confirmationSecret: "ttl-secret" });
    const audit = createAudit();
    const pendingActionService = new AIPendingActionService({ config, audit });
    const created = pendingActionService.create({
      sessionId: "ttl-session",
      requestedBy: "vendor_ttl",
      vendorId: "vendor_ttl",
      toolId: "property.listing.manage",
      action: "create_draft",
      intent: "property_listing_create",
      payload: { action: "create_draft", title: "TTL" },
      summary: "Create draft",
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const record = pendingActionService.get(created.pendingActionId);
    assert.equal(record.status, "expired");
    assert.ok(auditEvents.some((entry) => entry.action === "AI_ACTION_EXPIRED"));
  });

  it("gateway handleChat supports confirmation_required and confirm flow", async () => {
    const platform = createCommercePlatform();
    const sessionId = "gateway-commerce-session";

    const writeResult = await platform.gateway.handleChat({
      body: {
        message: "create a listing for my apartment in Kigali 600000 rwf",
        sessionId,
      },
      aiContext: { vendorId: "gateway_vendor", userId: null, anonymous: false },
      seller: { _id: "gateway_vendor" },
    });

    assert.equal(writeResult.data.type, "confirmation_required");
    assert.ok(writeResult.data.pendingAction);

    const pending = writeResult.data.pendingAction;
    const confirmResult = await platform.gateway.handleChat({
      body: {
        message: "confirm",
        sessionId,
        confirmActionId: pending.pendingActionId,
        actionChecksum: pending.actionChecksum,
      },
      aiContext: { vendorId: "gateway_vendor", userId: null, anonymous: false },
      seller: { _id: "gateway_vendor" },
    });

    assert.equal(confirmResult.data.type, "confirmation_executed");
  });

  it("gateway returns permission error for anonymous write intents", async () => {
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app);
    const ai = require("../../../controller/ai");
    app.use("/api/v2/ai", ai);

    const server = app.listen(0);
    const { port } = server.address();

    const writeResponse = await postJson(port, "/api/v2/ai/chat", {
      message: "create a listing for my apartment in Kigali 600000 rwf",
      sessionId: "anon-write-session",
    });

    server.close();
    assert.equal(writeResponse.status, 200);
    assert.equal(writeResponse.body.data.type, "error");
    assert.equal(writeResponse.body.data.error.reason, "permission_denied");
  });

  it("gateway cancel returns confirmation_cancelled", async () => {
    const platform = createCommercePlatform();
    const plan = await platform.planner.createPlan({
      requestId: "req-cancel",
      sessionId: "sess-cancel",
      message: "create a listing for my apartment 200000 rwf",
      type: "chat",
      vendorId: "vendor_cancel",
      role: "vendor",
    });
    const pending = await platform.planner.execute(plan, {
      sessionId: plan.sessionId,
      vendorId: "vendor_cancel",
      role: "vendor",
    });

    platform.confirmationHandler.cancel({
      cancelActionId: pending.pendingAction.pendingActionId,
      sessionId: plan.sessionId,
      authContext: { vendorId: "vendor_cancel", role: "vendor" },
    });

    const response = platform.planner.formatCancellationResponse({
      requestId: "req-cancel",
      sessionId: plan.sessionId,
    });
    assert.equal(response.type, "confirmation_cancelled");
  });

  it("regression: existing search tool still executes on first turn", async () => {
    const platform = createCommercePlatform();
    const plan = await platform.planner.createPlan({
      requestId: "req-search-regression",
      sessionId: "sess-search-regression",
      message: "find white sneakers",
      type: "chat",
    });
    assert.equal(plan.requiresConfirmation, false);
    const response = await platform.planner.execute(plan, {
      message: "find white sneakers",
      sessionId: plan.sessionId,
    });
    assert.notEqual(response.type, "confirmation_required");
    assert.ok(response.message);
  });
});
