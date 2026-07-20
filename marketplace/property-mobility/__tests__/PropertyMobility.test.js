const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const PropertyMobilityPlatform = require("../PropertyMobilityPlatform");
const { registerPropertyMobilityPlatform } = require("../index");
const { PlatformFeatureFlagService, PlatformFeatureFlagStore } = require("../../integration/features/PlatformFeatureFlagService");
const { DEFAULT_PRICING } = require("../PropertyMobilitySettingsDefaults");

describe("Property Mobility Phase 12", () => {
  before(() => {
    process.env.NODE_ENV = "test";
  });

  describe("PropertyMobilityPlatform services", () => {
    let platform;

    beforeEach(async () => {
      platform = new PropertyMobilityPlatform({ useMemoryOnly: true });
      const flags = new PlatformFeatureFlagService({ store: new PlatformFeatureFlagStore({ useMemoryOnly: true }) });
      await flags.refresh();
      platform.bindFeatureFlags(flags);
      await platform.initialize();
      platform.repository.resetForTests();
    });

    it("creates and publishes property listings", async () => {
      const listing = await platform.listingService.createListing("owner_1", {
        category: "apartments",
        title: "Modern Apartment",
        description: "2BR in Kigali",
        price: 250000,
        location: { city: "Kigali" },
        coordinates: { lat: -1.9441, lng: 30.0619 },
        amenities: ["parking"],
      });
      assert.equal(listing.status, "draft");

      const published = await platform.listingService.publishListing("owner_1", listing.listingId);
      assert.equal(published.status, "pending_review");

      const approved = await platform.moderationService.moderateListing("admin_1", listing.listingId, "approve");
      assert.equal(approved.status, "published");
    });

    it("searches listings with property and vehicle filters", async () => {
      await platform.listingService.createListing("owner_1", {
        category: "houses",
        title: "Family House",
        price: 100000000,
        publish: true,
      });
      const car = await platform.listingService.createListing("owner_1", {
        category: "cars",
        title: "Toyota RAV4",
        price: 15000000,
      });
      await platform.moderationService.moderateListing("admin_1", car.listingId, "approve");

      const propertyResults = await platform.searchBridge.searchListings({ listingType: "property" });
      assert.ok(propertyResults.listings.every((l) => l.category !== "cars"));

      const vehicleResults = await platform.searchBridge.searchListings({ listingType: "vehicle" });
      assert.ok(vehicleResults.listings.every((l) => l.category === "cars"));
    });

    it("applies configurable promotions", async () => {
      const listing = await platform.listingService.createListing("owner_1", {
        category: "land",
        title: "Plot in Gasabo",
        price: 50000000,
      });
      await platform.moderationService.moderateListing("admin_1", listing.listingId, "approve");

      const result = await platform.promotionBridge.applyPromotion("owner_1", listing.listingId, "featured");
      assert.equal(result.promotion.pricePaid, DEFAULT_PRICING.featuredPrice);
      assert.equal(result.listing.featured, true);
    });

    it("grants Yebone Verified badge with configurable fee and duration", async () => {
      const verification = await platform.verificationService.requestVerification("owner_1", {
        nationalIdVerified: true,
        phoneVerified: true,
        addressVerified: true,
      });
      assert.equal(verification.badge, "Yebone Verified");
      assert.equal(verification.feeAmount, DEFAULT_PRICING.verifiedBadgePrice);

      const status = await platform.verificationService.getVerificationStatus("owner_1");
      assert.equal(status.verified, true);
    });

    it("manages agency accounts and subscriptions", async () => {
      const agency = await platform.agencyService.createAgency("owner_1", {
        type: "real_estate_agency",
        name: "Kigali Realty",
      });
      const subscribed = await platform.agencyService.subscribeAgency("owner_1", agency.agencyId);
      assert.equal(subscribed.subscriptionStatus, "active");
      assert.equal(subscribed.unlimitedListings, true);

      await platform.updateConfiguration({
        pricing: { agencySubscriptionDurationDays: 45 },
      });
      const agency2 = await platform.agencyService.createAgency("owner_1", {
        type: "car_dealer",
        name: "Auto Hub",
      });
      const subscribed2 = await platform.agencyService.subscribeAgency("owner_1", agency2.agencyId);
      const durationMs = new Date(subscribed2.subscriptionExpiresAt).getTime() - Date.now();
      assert.ok(durationMs > 44 * 86_400_000);
      assert.ok(durationMs <= 46 * 86_400_000);
    });

    it("enforces agency listing limits when unlimited listings is disabled", async () => {
      await platform.updateConfiguration({
        settings: { agencies: { enabled: true, unlimitedListings: false, maxListings: 1 } },
      });
      const agency = await platform.agencyService.createAgency("owner_1", {
        type: "real_estate_agency",
        name: "Limited Realty",
      });
      await platform.agencyService.subscribeAgency("owner_1", agency.agencyId);

      await platform.listingService.createListing("owner_1", {
        category: "apartments",
        title: "First Listing",
        price: 100000,
      });

      await assert.rejects(
        () =>
          platform.listingService.createListing("owner_1", {
            category: "houses",
            title: "Second Listing",
            price: 200000,
          }),
        (error) => error.reason === "LISTING_LIMIT_REACHED"
      );
    });

    it("rejects agency subscription when agencies feature is disabled", async () => {
      await platform.updateConfiguration({ featureToggles: { agencies: false } });
      const agency = await platform.agencyService.createAgency("owner_1", {
        type: "real_estate_agency",
        name: "Disabled Agency",
      });
      await assert.rejects(
        () => platform.agencyService.subscribeAgency("owner_1", agency.agencyId),
        (error) => error.reason === "FEATURE_DISABLED"
      );
    });

    it("respects configurable homepage promotion limit", async () => {
      await platform.updateConfiguration({
        settings: { promotions: { enabled: true, homepagePromotionLimit: 2 } },
      });
      const listing = await platform.listingService.createListing("owner_1", {
        category: "land",
        title: "Plot A",
        price: 1000000,
      });
      await platform.moderationService.moderateListing("admin_1", listing.listingId, "approve");
      await platform.promotionBridge.applyPromotion("owner_1", listing.listingId, "homepage");

      const homepage = await platform.promotionBridge.getHomepageListings();
      assert.ok(homepage.length <= 2);
    });

    it("creates inbox-backed offers with acceptance flow", async () => {
      const listing = await platform.listingService.createListing("owner_1", {
        category: "commercial_property",
        title: "Office Space",
        price: 800000,
      });
      await platform.moderationService.moderateListing("admin_1", listing.listingId, "approve");

      const { offer, conversationId } = await platform.offerService.createOffer("buyer_1", {
        listingId: listing.listingId,
        type: "offer",
        amount: 750000,
        message: "Interested in negotiating",
      });
      assert.equal(offer.status, "pending");
      assert.ok(conversationId);

      const messages = platform.repository.getInboxMessages(conversationId);
      assert.ok(messages.length >= 1);

      const accepted = await platform.offerService.respondToOffer("owner_1", offer.offerId, "accepted");
      assert.equal(accepted.status, "accepted");
    });

    it("submits and moderates listing reports", async () => {
      const listing = await platform.listingService.createListing("owner_1", {
        category: "apartments",
        title: "Suspicious Listing",
        price: 1,
      });
      await platform.moderationService.moderateListing("admin_1", listing.listingId, "approve");

      const report = await platform.reportService.submitReport("user_2", {
        listingId: listing.listingId,
        reason: "fake_listing",
        details: "Price too low",
      });
      assert.equal(report.status, "pending");

      const moderated = await platform.moderationService.moderateReport("admin_1", report.reportId, "action_taken", "Suspended");
      assert.equal(moderated.status, "action_taken");
    });

    it("exposes admin dashboard metrics", async () => {
      const dashboard = await platform.moderationService.getAdminDashboard();
      assert.ok(dashboard.listings);
      assert.ok(dashboard.reports);
      assert.ok(dashboard.agencies);
    });

    it("allows super admin to update pricing configuration", async () => {
      await platform.updateConfiguration(
        {
          pricing: {
            verifiedBadgePrice: 12000,
            featuredPrice: 20000,
            sponsoredPrice: 22000,
            promotionDurationDays: 14,
            verificationDurationDays: 90,
            agencySubscriptionDurationDays: 60,
          },
          settings: {
            promotions: { enabled: true, homepagePromotionLimit: 8 },
            agencies: { enabled: true, unlimitedListings: false, maxListings: 25 },
          },
        },
        { admin: "admin_1" }
      );
      assert.equal(platform.getPricing().verifiedBadgePrice, 12000);
      assert.equal(platform.getPricing().featuredPrice, 20000);
      assert.equal(platform.getPricing().sponsoredPrice, 22000);
      assert.equal(platform.getPricing().promotionDurationDays, 14);
      assert.equal(platform.getPricing().verificationDurationDays, 90);
      assert.equal(platform.getPricing().agencySubscriptionDurationDays, 60);
      assert.equal(platform.getHomepagePromotionLimit?.() ?? platform.configStore.getHomepagePromotionLimit(), 8);
      assert.equal(platform.configStore.getAgencyLimits().maxListings, 25);
      assert.equal(platform.configStore.getAgencyLimits().unlimitedListings, false);
    });
  });

  describe("HTTP registration", () => {
    it("registers health and search routes", async () => {
      const app = express();
      registerPropertyMobilityPlatform(app, { useMemoryOnly: true });
      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const { port } = server.address();

      const health = await fetch(`http://127.0.0.1:${port}/api/v2/marketplace/property-mobility/health`);
      const healthBody = await health.json();
      assert.equal(healthBody.data.module, "property-mobility");

      const search = await fetch(`http://127.0.0.1:${port}/api/v2/marketplace/property-mobility/search`);
      const searchBody = await search.json();
      assert.equal(searchBody.success, true);

      await new Promise((resolve) => server.close(resolve));
    });
  });
});
