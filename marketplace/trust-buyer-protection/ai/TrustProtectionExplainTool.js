const BaseTool = require("../../ai/tools/BaseTool");

class TrustProtectionExplainTool extends BaseTool {
  constructor({ buyerProtectionService, policyService } = {}) {
    super({
      id: "trust.protection.explain",
      name: "TrustProtectionExplainTool",
      version: "14.0.0",
      capabilities: ["trust_protection_explain", "buyer_protection_status"],
      permissions: ["authenticated"],
      platform: "TrustBuyerProtectionPlatform",
    });
    this.buyerProtectionService = buyerProtectionService;
    this.policyService = policyService;
  }

  async execute(input = {}, _context = {}) {
    const orderId = input.orderId;
    if (!orderId) {
      const error = new Error("orderId is required");
      error.statusCode = 400;
      throw error;
    }
    const status = await this.buyerProtectionService.getProtectionStatus(orderId);
    const policies = this.policyService.getPolicies();
    return {
      orderId: String(orderId),
      protection: status,
      policies: {
        protectionDurationDays: policies.protectionDurationDays,
        maximumClaimPeriodDays: policies.maximumClaimPeriodDays,
        eligibleCategories: policies.eligibleCategories,
      },
      readOnly: true,
    };
  }
}

module.exports = TrustProtectionExplainTool;
