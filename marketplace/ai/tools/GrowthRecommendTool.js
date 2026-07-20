const BaseTool = require("./BaseTool");

class GrowthRecommendTool extends BaseTool {
  constructor({ growthCommerceAI } = {}) {
    super({
      id: "growth.recommend",
      name: "GrowthRecommendTool",
      version: "13.0.0",
      capabilities: ["growth_recommendations", "campaign_recommendations"],
      permissions: ["public"],
      platform: "GrowthCommerceAIService",
    });
    this.growthCommerceAI = growthCommerceAI;
  }

  async execute(input = {}, _context = {}) {
    return this.growthCommerceAI.recommend({
      limit: input.limit || 5,
      q: input.q || input.query || input.message,
    });
  }
}

module.exports = GrowthRecommendTool;
