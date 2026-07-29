/**
 * AI platform health probe.
 */
const { YEBO_AI_BRAND } = require("./utils/ProviderMasking");

class AIHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check(options = {}) {
    const metrics = this.platform.metrics.getSnapshot();
    const tools = this.platform.toolRegistry.list();
    const prompts = this.platform.promptRegistry.list();
    const toolHealth = this.platform.toolRegistry.healthCheck();
    const adminView = options.admin === true;

    const publicMetrics = adminView
      ? metrics
      : (({ totalProviderCostUsd, ...rest }) => rest)(metrics);

    const payload = {
      name: this.platform.config.name,
      version: this.platform.config.version,
      phase: "14.0",
      healthy: toolHealth.healthy,
      gateway: true,
      productionTools: true,
      naturalLanguageSearch: true,
      commerceAssistant: true,
      commerceAgent: true,
      trustBuyerProtection: true,
      contextualRecommendations: true,
      checkoutIntelligence: true,
      conversationMemory: true,
      confirmationProtocol: true,
      toolsRegistered: tools.length,
      capabilitiesRegistered: this.platform.capabilityRegistry.listCapabilities().length,
      promptsLoaded: prompts.length,
      hooks: this.platform.hooks.snapshot(),
      metrics: publicMetrics,
      tools: toolHealth.tools,
      promptVersions: this.platform.promptRegistry.getActiveVersions(),
      displayBrand: YEBO_AI_BRAND,
    };

    if (adminView) {
      payload.providers = this.platform.providerRegistry?.getSnapshot?.() || this.platform.providerManager.getSnapshot();
      payload.openaiConfigured = this.platform.providerRegistry?.openaiConfig?.isConfigured?.() || false;
      payload.fashnConfigured = this.platform.providerRegistry?.fashnConfig?.isConfigured?.() || false;
      payload.mockProviderActive = payload.providers.activeProvider === "mock" || !payload.openaiConfigured;
      payload.router = this.platform.router?.getSnapshot?.() || null;
    } else {
      payload.providers = {
        yebo_ai: { status: "active", displayBrand: YEBO_AI_BRAND },
      };
      payload.mockProviderActive = false;
    }

    return payload;
  }
}

module.exports = AIHealth;
