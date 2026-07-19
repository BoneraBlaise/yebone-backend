const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const GrowthCommercePlatform = require("../GrowthCommercePlatform");
const CampaignStateMachine = require("../CampaignStateMachine");
const { registerGrowthCommercePlatform } = require("../index");
const { registerMarketplaceCore } = require("../../index");
const { PlatformFeatureFlagService, PlatformFeatureFlagStore } = require("../../integration/features/PlatformFeatureFlagService");

describe("Growth Commerce Phase 10", () => {
  before(() => {
    process.env.REFERRAL_ATTRIBUTION_SECRET = process.env.REFERRAL_ATTRIBUTION_SECRET || "test-attribution-secret";
    process.env.NODE_ENV = "test";
  });

  describe("CampaignStateMachine", () => {
    const machine = new CampaignStateMachine();

    it("allows draft to scheduled", () => {
      const result = machine.assertTransition("draft", "scheduled");
      assert.equal(result.valid, true);
    });

    it("rejects active to draft", () => {
      const result = machine.assertTransition("active", "draft");
      assert.equal(result.valid, false);
    });
  });

  describe("GrowthCommercePlatform services", () => {
    let platform;

    beforeEach(async () => {
      platform = new GrowthCommercePlatform({ useMemoryOnly: true });
      const flags = new PlatformFeatureFlagService({ store: new PlatformFeatureFlagStore({ useMemoryOnly: true }) });
      await flags.refresh();
      platform.bindFeatureFlags(flags);
      await platform.initialize();
      platform.repository.resetForTests();
    });

    it("creates and transitions campaign lifecycle", async () => {
      const campaign = await platform.campaignService.createCampaign("vendor_1", {
        name: "Weekend Blast",
        type: "weekend_sale",
        discountType: "percentage",
        discountValue: 15,
        targetProducts: ["prod_1"],
      });
      assert.equal(campaign.status, "draft");

      const scheduled = await platform.campaignService.updateStatus(campaign.campaignId, "scheduled");
      assert.equal(scheduled.status, "scheduled");

      const active = await platform.campaignService.updateStatus(campaign.campaignId, "active");
      assert.equal(active.status, "active");

      const paused = await platform.campaignService.updateStatus(campaign.campaignId, "paused");
      assert.equal(paused.status, "paused");
    });

    it("duplicates vendor campaigns as draft copies", async () => {
      const source = await platform.campaignService.createCampaign("vendor_1", {
        name: "Flash Friday",
        type: "flash_sale",
        discountType: "percentage",
        discountValue: 20,
      });
      const copy = await platform.campaignService.duplicateCampaign("vendor_1", source.campaignId);
      assert.notEqual(copy.campaignId, source.campaignId);
      assert.match(copy.name, /Copy/);
      assert.equal(copy.status, "draft");
    });

    it("automates scheduled start and end with homepage activation", async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const future = new Date(Date.now() + 86_400_000).toISOString();

      const campaign = await platform.repository.create({
        vendorId: "vendor_1",
        name: "Auto Campaign",
        type: "flash_sale",
        status: "scheduled",
        startDate: past,
        endDate: future,
        homepageSection: "flashSaleSection",
        discountType: "percentage",
        discountValue: 10,
      });

      const startResult = await platform.automationService.processDueCampaigns();
      assert.ok(startResult.changes.some((c) => c.campaignId === campaign.campaignId && c.to === "active"));

      const sections = await platform.homepageService.loadSections();
      assert.equal(String(sections.flashSaleSection.campaignId), String(campaign.campaignId));
      assert.equal(sections.flashSaleSection.enabled, true);

      await platform.repository.update(campaign.campaignId, {
        endDate: new Date(Date.now() - 1_000).toISOString(),
      });

      const endResult = await platform.automationService.processDueCampaigns();
      assert.ok(endResult.changes.some((c) => c.campaignId === campaign.campaignId && c.to === "expired"));
    });

    it("resolves configurable homepage sections", async () => {
      await platform.homepageService.updateSections({
        heroBanner: { enabled: true, title: "Big Sale", subtitle: "Limited time", imageUrl: "/hero.jpg" },
        featuredProducts: { enabled: true, limit: 6 },
      });

      const homepage = await platform.homepageService.resolvePublicHomepage();
      assert.equal(homepage.sections.heroBanner.title, "Big Sale");
      assert.equal(homepage.sections.featuredProducts.enabled, true);
    });

    it("computes vendor marketing dashboard metrics", async () => {
      await platform.repository.create({
        vendorId: "vendor_1",
        name: "Tracked Campaign",
        type: "scheduled_sale",
        status: "active",
        analytics: { views: 100, clicks: 20, orders: 5, revenue: 500 },
        targetProducts: ["prod_a"],
        discountType: "percentage",
        discountValue: 5,
      });

      const dashboard = await platform.marketingDashboard.getVendorDashboard("vendor_1");
      assert.equal(dashboard.metrics.views, 100);
      assert.equal(dashboard.metrics.clicks, 20);
      assert.equal(dashboard.metrics.conversionRate, 25);
      assert.equal(dashboard.topProducts.length, 1);
    });

    it("computes admin marketplace dashboard metrics", async () => {
      await platform.repository.create({
        vendorId: "vendor_a",
        name: "Market Campaign",
        type: "featured_campaign",
        status: "active",
        analytics: { views: 50, clicks: 10, orders: 2, revenue: 200 },
        discountType: "percentage",
        discountValue: 12,
      });

      const dashboard = await platform.marketingDashboard.getAdminDashboard();
      assert.equal(dashboard.marketplaceMetrics.views, 50);
      assert.equal(dashboard.activeCampaigns, 1);
      assert.equal(dashboard.topVendors.length, 1);
    });

    it("enriches search results with promotion badges", async () => {
      await platform.repository.create({
        vendorId: "vendor_1",
        name: "Search Promo",
        type: "flash_sale",
        status: "active",
        targetProducts: ["507f1f77bcf86cd799439011"],
        discountType: "percentage",
        discountValue: 30,
      });

      const enriched = await platform.searchBridge.enrichProductResults({
        products: [{ _id: "507f1f77bcf86cd799439011", name: "Phone" }],
        meta: {},
      });

      assert.equal(enriched.products[0].growthCommerce.flashSale, true);
      assert.ok(enriched.products[0].growthCommerce.promotionBadges.includes("Flash Sale"));
    });

    it("returns AI recommendations from active campaigns", async () => {
      await platform.repository.create({
        vendorId: "vendor_1",
        name: "AI Deal",
        type: "flash_sale",
        status: "active",
        discountType: "percentage",
        discountValue: 40,
      });

      const result = await platform.aiService.recommend({ limit: 5 });
      assert.equal(result.meta.enabled, true);
      assert.ok(result.recommendations.length >= 1);
      assert.ok(result.flashSales.length >= 1);
    });

    it("stores ambassador profiles and campaign assignments", async () => {
      const ambassador = await platform.affiliateService.upsertAmbassador("user_1", {
        displayName: "Ambassador One",
        bio: "Top promoter",
      });
      assert.equal(ambassador.displayName, "Ambassador One");

      const assigned = await platform.affiliateService.assignCampaign("user_1", "gc_test_campaign");
      assert.ok(assigned.campaignIds.includes("gc_test_campaign"));
    });
  });

  describe("Growth Commerce HTTP registration", () => {
    it("exposes health and public homepage endpoints", async () => {
      const app = express();
      registerGrowthCommercePlatform(app, { useMemoryOnly: true });
      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const { port } = server.address();

      const health = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/v2/marketplace/growth-commerce/health`, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        }).on("error", reject);
      });

      assert.equal(health.success, true);
      assert.equal(health.data.phase, "10");

      server.close();
    });
  });

  describe("Marketplace integration", () => {
    it("registers growth commerce with platform feature flags", async () => {
      const app = express();
      registerMarketplaceCore(app, {
        growth: { useMemoryOnly: true },
        growthCommerce: { useMemoryOnly: true },
        integration: { useMemoryOnly: true, skipSearchIndexes: true },
        delivery: { useMemoryOnly: true },
        deliveryConfiguration: { useMemoryOnly: true },
      });

      const platform = require("../../index").getGrowthCommercePlatform();
      const health = platform.health();
      assert.equal(health.phase, "10");
      assert.equal(health.services.campaigns, true);
    });
  });
});
