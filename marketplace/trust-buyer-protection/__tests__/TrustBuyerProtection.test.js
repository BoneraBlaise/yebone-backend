const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const TrustBuyerProtectionPlatform = require("../TrustBuyerProtectionPlatform");
const { registerTrustBuyerProtectionPlatform } = require("../index");
const {
  PlatformFeatureFlagService,
  PlatformFeatureFlagStore,
} = require("../../integration/features/PlatformFeatureFlagService");
const TrustProtectionExplainTool = require("../ai/TrustProtectionExplainTool");
const DisputeStatusTool = require("../ai/DisputeStatusTool");
const VerificationExplainTool = require("../ai/VerificationExplainTool");
const TrustScoreExplainTool = require("../ai/TrustScoreExplainTool");
const RefundEligibilityTool = require("../ai/RefundEligibilityTool");

describe("Trust & Buyer Protection Phase 14", () => {
  before(() => {
    process.env.NODE_ENV = "test";
  });

  describe("TrustBuyerProtectionPlatform services", () => {
    let platform;

    beforeEach(async () => {
      platform = new TrustBuyerProtectionPlatform({ useMemoryOnly: true });
      const flags = new PlatformFeatureFlagService({
        store: new PlatformFeatureFlagStore({ useMemoryOnly: true }),
      });
      await flags.refresh();
      platform.bindFeatureFlags(flags);
      await platform.initialize();
      platform.repository.resetForTests();
      platform.ordersBridge.resetForTests();
      platform.paymentBridge.resetForTests();

      platform.ordersBridge.seedOrder({
        orderId: "order_1",
        userId: "buyer_1",
        shopId: "seller_1",
        totalPrice: 5000,
        category: "electronics",
        currency: "RWF",
      });
    });

    it("checks buyer protection eligibility from configurable policies", async () => {
      const eligibility = await platform.buyerProtectionService.checkEligibility("order_1");
      assert.equal(eligibility.eligible, true);
      assert.equal(eligibility.category, "electronics");
      assert.ok(eligibility.expiresAt);
    });

    it("activates protection and tracks lifecycle history", async () => {
      const protection = await platform.buyerProtectionService.activateProtection("order_1", {
        actor: "system",
      });
      assert.equal(protection.status, "active");
      assert.equal(protection.orderId, "order_1");

      const history = await platform.buyerProtectionService.getProtectionHistory(protection.protectionId);
      assert.ok(history.some((h) => h.action === "activated"));
    });

    it("opens dispute and transitions through state machine", async () => {
      const dispute = await platform.disputeService.openDispute(
        "buyer_1",
        { orderId: "order_1", reason: "not_received", description: "Item missing" },
        { actor: "buyer_1" }
      );
      assert.equal(dispute.status, "OPEN");
      assert.equal(dispute.buyerId, "buyer_1");

      const reviewed = await platform.disputeService.transitionDispute(dispute.disputeId, "UNDER_REVIEW", {
        actor: "admin_1",
        assignedAdmin: "admin_1",
      });
      assert.equal(reviewed.status, "UNDER_REVIEW");
      assert.equal(reviewed.assignedAdmin, "admin_1");
    });

    it("rejects invalid dispute transitions", async () => {
      const dispute = await platform.disputeService.openDispute(
        "buyer_1",
        { orderId: "order_1", reason: "damaged" },
        { actor: "buyer_1" }
      );
      await assert.rejects(
        () => platform.disputeService.transitionDispute(dispute.disputeId, "REFUNDED"),
        (err) => err.reason === "INVALID_TRANSITION"
      );
    });

    it("manages escrow workflow with audited transitions", async () => {
      const escrow = await platform.escrowService.initiateEscrow("order_1", { actor: "system" });
      assert.equal(escrow.status, "PENDING");

      const held = await platform.escrowService.transitionEscrow(escrow.escrowId, "FUNDS_HELD", {
        actor: "system",
      });
      assert.equal(held.status, "FUNDS_HELD");

      const delivery = await platform.escrowService.transitionEscrow(escrow.escrowId, "DELIVERY_CONFIRMED", {
        actor: "buyer_1",
      });
      assert.equal(delivery.status, "DELIVERY_CONFIRMED");
    });

    it("submits and reviews unified verification", async () => {
      const submitted = await platform.verificationService.submitVerification(
        "vendor_1",
        { subjectType: "vendor", type: "Business", evidence: { doc: "reg.pdf" } },
        { actor: "vendor_1" }
      );
      assert.equal(submitted.status, "Submitted");

      const verified = await platform.verificationService.reviewVerification(
        submitted.verificationId,
        "approve",
        { actor: "admin_1" }
      );
      assert.equal(verified.status, "Verified");
    });

    it("computes trust score from configurable weights", async () => {
      const score = await platform.trustScoreService.computeTrustScore("user_1", {
        successfulOrders: 10,
        cancelledOrders: 1,
        refundRate: 0.05,
        disputeRate: 0.02,
        verificationLevel: 2,
        accountAgeDays: 180,
        averageRating: 4.5,
        policyViolations: 0,
      });
      assert.ok(score.score >= 0 && score.score <= 100);
      assert.ok(score.weights.successfulOrders);
    });

    it("detects fraud signals without auto-ban", async () => {
      const result = await platform.fraudDetectionService.runDetection("user_suspicious", {
        fakeAccountCount: 5,
        failedPaymentCount: 4,
        disputeRate: 0.5,
        ordersPerHour: 15,
        verificationMismatch: true,
      });
      assert.ok(["HIGH", "CRITICAL"].includes(result.riskLevel));
      assert.equal(result.requiresAdminReview, true);
      assert.ok(result.alert);
    });

    it("updates protection policies centrally", async () => {
      await platform.policyService.updatePolicies({ protectionDurationDays: 45 });
      const policies = platform.policyService.getPolicies();
      assert.equal(policies.protectionDurationDays, 45);
    });

    it("returns admin analytics dashboard", async () => {
      await platform.buyerProtectionService.activateProtection("order_1");
      const dashboard = await platform.analyticsService.getAdminDashboard();
      assert.equal(dashboard.phase, "14.0");
      assert.ok(dashboard.disputes);
      assert.ok(dashboard.escrow);
      assert.ok(dashboard.protection);
    });
  });

  describe("AI read-only trust tools", () => {
    let platform;

    beforeEach(async () => {
      platform = new TrustBuyerProtectionPlatform({ useMemoryOnly: true });
      await platform.initialize();
      platform.repository.resetForTests();
      platform.ordersBridge.seedOrder({
        orderId: "order_ai",
        userId: "buyer_ai",
        shopId: "seller_ai",
        totalPrice: 3000,
        category: "fashion",
      });
      await platform.buyerProtectionService.activateProtection("order_ai");
    });

    it("explains protection status read-only", async () => {
      const tool = new TrustProtectionExplainTool({
        buyerProtectionService: platform.buyerProtectionService,
        policyService: platform.policyService,
      }).initialize();
      const result = await tool.execute({ orderId: "order_ai" });
      assert.equal(result.readOnly, true);
      assert.equal(result.protection.protected, true);
    });

    it("explains dispute status read-only", async () => {
      const dispute = await platform.disputeService.openDispute(
        "buyer_ai",
        { orderId: "order_ai", reason: "wrong_item" },
        { actor: "buyer_ai" }
      );
      const tool = new DisputeStatusTool({ disputeService: platform.disputeService }).initialize();
      const result = await tool.execute({ disputeId: dispute.disputeId }, { userId: "buyer_ai" });
      assert.equal(result.readOnly, true);
      assert.equal(result.status, "OPEN");
    });

    it("explains verification read-only", async () => {
      await platform.verificationService.submitVerification(
        "buyer_ai",
        { type: "Email", subjectType: "customer" },
        { actor: "buyer_ai" }
      );
      const tool = new VerificationExplainTool({
        verificationService: platform.verificationService,
      }).initialize();
      const result = await tool.execute({}, { userId: "buyer_ai" });
      assert.equal(result.readOnly, true);
      assert.ok(Array.isArray(result.verifications));
    });

    it("explains trust score read-only", async () => {
      const tool = new TrustScoreExplainTool({
        trustScoreService: platform.trustScoreService,
      }).initialize();
      const result = await tool.execute({}, { userId: "buyer_ai" });
      assert.equal(result.readOnly, true);
      assert.ok(result.score >= 0);
    });

    it("explains refund eligibility without approving", async () => {
      const tool = new RefundEligibilityTool({
        buyerProtectionService: platform.buyerProtectionService,
        policyService: platform.policyService,
      }).initialize();
      const result = await tool.execute({ orderId: "order_ai" });
      assert.equal(result.readOnly, true);
      assert.ok(result.note.includes("cannot approve"));
    });
  });

  describe("Platform registration", () => {
    it("registers health endpoint", async () => {
      const express = require("express");
      const app = express();
      registerTrustBuyerProtectionPlatform(app, { useMemoryOnly: true });
      const platform = require("../index").getTrustBuyerProtectionPlatform();
      const health = platform.health();
      assert.equal(health.phase, "14.0");
      assert.equal(health.domain, "trust-buyer-protection");
    });
  });
});
