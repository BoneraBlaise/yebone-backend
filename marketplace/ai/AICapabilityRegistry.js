/**
 * AI capability registry — planner resolves tools by capability, not hardcoded names.
 */
class AICapabilityRegistry {
  constructor() {
    this.capabilityToTools = new Map();
    this.intentCapabilities = new Map([
      ["search", ["keyword", "pagination", "filters"]],
      ["order_status", ["history", "tracking", "order_status"]],
      ["vendor_lookup", ["shop_lookup", "seller_lookup"]],
      ["recommend", ["recommendations", "candidate_composition"]],
      ["checkout", ["checkout_guidance", "product_comparison", "purchase_readiness"]],
      ["payment", ["readiness", "payment_availability", "health"]],
      ["catalog", ["product_lookup", "product_details"]],
      ["knowledge", ["faq", "policy", "platform_docs"]],
      ["commerce_chat", ["faq", "platform_docs"]],
      ["property_search", ["property_search", "vehicle_search", "location_filter", "price_filter"]],
      ["property_listing_details", ["property_listing_details", "listing_lookup"]],
      ["growth_recommend", ["growth_recommendations", "campaign_recommendations"]],
      ["seller_inventory", ["seller_inventory_snapshot", "inventory_health"]],
      ["property_listing_create", ["property_listing_create"]],
      ["property_listing_publish", ["property_listing_publish"]],
    ]);
  }

  registerCapability(capability, toolId) {
    if (!capability || !toolId) return;
    const existing = this.capabilityToTools.get(capability) || [];
    if (!existing.includes(toolId)) {
      existing.push(toolId);
      this.capabilityToTools.set(capability, existing);
    }
  }

  registerFromTools(tools = []) {
    for (const tool of tools) {
      const toolId = tool.id || tool.metadata?.().id;
      const capabilities =
        typeof tool.capabilities === "function" ? tool.capabilities() : tool.capabilities || [];
      for (const capability of capabilities) {
        this.registerCapability(capability, toolId);
      }
    }
  }

  getToolsForCapability(capability) {
    return [...(this.capabilityToTools.get(capability) || [])];
  }

  listCapabilities() {
    return [...this.capabilityToTools.keys()].sort();
  }

  resolve(capabilities = []) {
    const scores = new Map();
    for (const capability of capabilities) {
      const toolIds = this.getToolsForCapability(capability);
      for (const toolId of toolIds) {
        scores.set(toolId, (scores.get(toolId) || 0) + 1);
      }
    }

    let bestToolId = null;
    let bestScore = 0;
    for (const [toolId, score] of scores.entries()) {
      if (score > bestScore) {
        bestToolId = toolId;
        bestScore = score;
      }
    }

    return {
      toolId: bestToolId,
      matchedCapabilities: capabilities.filter(
        (capability) => this.getToolsForCapability(capability).includes(bestToolId)
      ),
      score: bestScore,
    };
  }

  resolveIntent(intent = {}) {
    const capabilities =
      intent.capabilities ||
      this.intentCapabilities.get(intent.intent) ||
      this.intentCapabilities.get("commerce_chat");
    return this.resolve(capabilities);
  }
}

module.exports = AICapabilityRegistry;
