/**
 * AI platform health probe.
 */
class AIHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    const metrics = this.platform.metrics.getSnapshot();
    const providers = this.platform.providerManager.getSnapshot();
    const tools = this.platform.toolRegistry.list();
    const prompts = this.platform.promptRegistry.list();
    const toolHealth = this.platform.toolRegistry.healthCheck();

    return {
      name: this.platform.config.name,
      version: this.platform.config.version,
      phase: "7.7",
      healthy: toolHealth.healthy,
      gateway: true,
      productionTools: true,
      naturalLanguageSearch: true,
      commerceAssistant: true,
      contextualRecommendations: true,
      checkoutIntelligence: true,
      conversationMemory: true,
      mockProviderActive: providers.activeProvider === "mock",
      toolsRegistered: tools.length,
      capabilitiesRegistered: this.platform.capabilityRegistry.listCapabilities().length,
      promptsLoaded: prompts.length,
      hooks: this.platform.hooks.snapshot(),
      metrics,
      providers,
      tools: toolHealth.tools,
      promptVersions: this.platform.promptRegistry.getActiveVersions(),
    };
  }
}

module.exports = AIHealth;
