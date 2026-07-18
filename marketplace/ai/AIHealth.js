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

    return {
      name: this.platform.config.name,
      version: this.platform.config.version,
      phase: "7.1",
      healthy: true,
      gateway: true,
      mockProviderActive: providers.activeProvider === "mock",
      toolsRegistered: tools.length,
      promptsLoaded: prompts.length,
      hooks: this.platform.hooks.snapshot(),
      metrics,
      providers,
      promptVersions: this.platform.promptRegistry.getActiveVersions(),
    };
  }
}

module.exports = AIHealth;
