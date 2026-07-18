const AIConfiguration = require("./AIConfiguration");
const AIHooks = require("./AIHooks");
const AIMetrics = require("./AIMetrics");
const AIPromptRegistry = require("./AIPromptRegistry");
const AIProviderManager = require("./AIProviderManager");
const AIToolRegistry = require("./AIToolRegistry");
const AICapabilityRegistry = require("./AICapabilityRegistry");
const AIConversationContext = require("./conversation/AIConversationContext");
const AIPlanner = require("./AIPlanner");
const AIGateway = require("./AIGateway");
const AIHealth = require("./AIHealth");
const AIGatewayValidation = require("./validation/AIGatewayValidation");
const AIRequestSecurity = require("./security/AIRequestSecurity");

/**
 * AI Platform composition root — orchestration layer only.
 */
class AIPlatform {
  constructor({ marketplaceCore, config } = {}) {
    if (!marketplaceCore) {
      throw new Error("AIPlatform requires marketplaceCore");
    }

    this.marketplaceCore = marketplaceCore;
    this.config = new AIConfiguration(config);
    this.hooks = new AIHooks();
    this.metrics = new AIMetrics();
    this.promptRegistry = new AIPromptRegistry(config?.prompts || {});
    this.providerManager = new AIProviderManager(this.config);
    this.toolRegistry = new AIToolRegistry({ metrics: this.metrics });
    this.capabilityRegistry = new AICapabilityRegistry();
    this.conversationContext = new AIConversationContext({
      ttlMs: this.config.conversationTtlMs,
      maxSessions: this.config.conversationMaxSessions,
    });
    this.validation = new AIGatewayValidation(this.config);
    this.security = new AIRequestSecurity(this.config, this.hooks);
    this.planner = new AIPlanner({
      toolRegistry: this.toolRegistry,
      capabilityRegistry: this.capabilityRegistry,
      promptRegistry: this.promptRegistry,
      providerManager: this.providerManager,
      hooks: this.hooks,
      metrics: this.metrics,
      config: this.config,
      conversationContext: this.conversationContext,
    });
    this.gateway = new AIGateway(this);
    this.health = new AIHealth(this);
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return this.getSnapshot();

    this.providerManager.initializeAll();
    this.toolRegistry.registerProductionTools({
      marketplaceCore: this.marketplaceCore,
    });
    this.capabilityRegistry.registerFromTools([...this.toolRegistry.tools.values()]);
    this._initialized = true;
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      name: this.config.name,
      version: this.config.version,
      initialized: this._initialized,
      tools: this.toolRegistry.list().length,
      capabilities: this.capabilityRegistry.listCapabilities().length,
      providers: this.providerManager.listProviders(),
      metrics: this.metrics.getSnapshot(),
    };
  }
}

module.exports = AIPlatform;
