const BaseTool = require("../../ai/tools/BaseTool");

class RefundEligibilityTool extends BaseTool {
  constructor({ buyerProtectionService, policyService } = {}) {
    super({
      id: "trust.refund.eligibility",
      name: "RefundEligibilityTool",
      version: "14.0.0",
      capabilities: ["refund_eligibility", "trust_refund_explain"],
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

    const protection = await this.buyerProtectionService.getProtectionStatus(orderId);
    const policies = this.policyService.getPolicies();
    const eligible =
      protection.protected === true &&
      protection.status === "active" &&
      policies.refundRules?.partialRefundAllowed !== false;

    return {
      orderId: String(orderId),
      refundEligible: eligible,
      protection,
      refundRules: policies.refundRules,
      maximumClaimPeriodDays: policies.maximumClaimPeriodDays,
      readOnly: true,
      note: "AI cannot approve refunds — admin review required.",
    };
  }
}

module.exports = RefundEligibilityTool;
