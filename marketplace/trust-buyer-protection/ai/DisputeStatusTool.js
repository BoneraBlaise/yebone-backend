const BaseTool = require("../../ai/tools/BaseTool");

class DisputeStatusTool extends BaseTool {
  constructor({ disputeService } = {}) {
    super({
      id: "trust.dispute.status",
      name: "DisputeStatusTool",
      version: "14.0.0",
      capabilities: ["dispute_status", "trust_dispute_lookup"],
      permissions: ["authenticated"],
      platform: "TrustBuyerProtectionPlatform",
    });
    this.disputeService = disputeService;
  }

  async execute(input = {}, context = {}) {
    const disputeId = input.disputeId;
    const orderId = input.orderId;
    if (!disputeId && !orderId) {
      const error = new Error("disputeId or orderId is required");
      error.statusCode = 400;
      throw error;
    }

    let dispute;
    if (disputeId) {
      dispute = await this.disputeService.getDispute(disputeId, {
        requesterId: context.userId,
        role: context.role,
      });
    } else {
      const matches = await this.disputeService.listDisputes({ orderId: String(orderId) });
      dispute = matches[0] || null;
    }

    if (!dispute) {
      return { found: false, orderId, readOnly: true };
    }

    return {
      found: true,
      disputeId: dispute.disputeId,
      orderId: dispute.orderId,
      status: dispute.status,
      reason: dispute.reason,
      timeline: dispute.timeline,
      resolution: dispute.resolution,
      readOnly: true,
    };
  }
}

module.exports = DisputeStatusTool;
