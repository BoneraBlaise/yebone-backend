const BaseTool = require("../../ai/tools/BaseTool");

class TrustScoreExplainTool extends BaseTool {
  constructor({ trustScoreService } = {}) {
    super({
      id: "trust.score.explain",
      name: "TrustScoreExplainTool",
      version: "14.0.0",
      capabilities: ["trust_score_explain", "trust_score_lookup"],
      permissions: ["authenticated"],
      platform: "TrustBuyerProtectionPlatform",
    });
    this.trustScoreService = trustScoreService;
  }

  async execute(input = {}, context = {}) {
    const subjectId = input.subjectId || context.userId;
    const explanation = await this.trustScoreService.explainScore(subjectId);
    return { ...explanation, readOnly: true };
  }
}

module.exports = TrustScoreExplainTool;
