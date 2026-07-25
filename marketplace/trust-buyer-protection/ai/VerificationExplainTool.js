const BaseTool = require("../../ai/tools/BaseTool");

class VerificationExplainTool extends BaseTool {
  constructor({ verificationService } = {}) {
    super({
      id: "trust.verification.explain",
      name: "VerificationExplainTool",
      version: "14.0.0",
      capabilities: ["verification_explain", "trust_verification_status"],
      permissions: ["authenticated"],
      platform: "TrustBuyerProtectionPlatform",
    });
    this.verificationService = verificationService;
  }

  async execute(input = {}, context = {}) {
    const subjectId = input.subjectId || context.userId;
    const subjectType = input.subjectType || "customer";
    const status = await this.verificationService.getVerificationStatus(subjectId, subjectType);
    return { ...status, readOnly: true };
  }
}

module.exports = VerificationExplainTool;
