const CampaignRepository = require("./CampaignRepository");
const CampaignStateMachine = require("./CampaignStateMachine");
const CampaignService = require("./CampaignService");
const CampaignAutomationService = require("./CampaignAutomationService");
const PromotionEngineService = require("./PromotionEngineService");
const HomepageMerchandisingService = require("./HomepageMerchandisingService");
const AffiliateCommerceService = require("./AffiliateCommerceService");
const MarketingDashboardService = require("./MarketingDashboardService");
const GrowthCommerceConfigStore = require("./GrowthCommerceConfigStore");
const GrowthCommerceSearchBridge = require("./GrowthCommerceSearchBridge");
const GrowthCommerceAIService = require("./GrowthCommerceAIService");
const GrowthCommerceHealth = require("./GrowthCommerceHealth");
const PlatformAuditAdapter = require("../integration/audit/PlatformAuditAdapter");

class GrowthCommercePlatform {
  constructor(options = {}) {
    this.useMemoryOnly = Boolean(options.useMemoryOnly);
    this.featureFlags = options.featureFlags || null;
    this.observability = options.observability || null;

    this.repository = options.repository || new CampaignRepository({ useMemoryOnly: this.useMemoryOnly });
    this.configStore = options.configStore || new GrowthCommerceConfigStore({ useMemoryOnly: this.useMemoryOnly });
    this.homepageService =
      options.homepageService ||
      new HomepageMerchandisingService({
        campaignRepository: this.repository,
        useMemoryOnly: this.useMemoryOnly,
      });
    this.promotionEngine = options.promotionEngine || new PromotionEngineService();
    this.affiliateService =
      options.affiliateService ||
      new AffiliateCommerceService({ useMemoryOnly: this.useMemoryOnly });

    const audit = { record: (payload) => PlatformAuditAdapter.record(payload) };
    this.campaignService =
      options.campaignService ||
      new CampaignService({
        repository: this.repository,
        stateMachine: new CampaignStateMachine(),
        audit,
        observability: this.observability,
      });
    this.automationService =
      options.automationService ||
      new CampaignAutomationService({
        repository: this.repository,
        homepageService: this.homepageService,
        audit,
      });
    this.marketingDashboard =
      options.marketingDashboard ||
      new MarketingDashboardService({
        campaignService: this.campaignService,
        campaignRepository: this.repository,
      });
    this.searchBridge =
      options.searchBridge ||
      new GrowthCommerceSearchBridge({
        campaignRepository: this.repository,
        featureFlags: this.featureFlags,
      });
    this.aiService =
      options.aiService ||
      new GrowthCommerceAIService({
        campaignRepository: this.repository,
        homepageService: this.homepageService,
        featureFlags: this.featureFlags,
      });

    this.initialized = false;
  }

  setModels({ CampaignModel, HomepageModel, AmbassadorModel, ConfigModel } = {}) {
    if (CampaignModel) this.repository.setModel(CampaignModel);
    if (HomepageModel) this.homepageService.setModel(HomepageModel);
    if (AmbassadorModel) this.affiliateService.setModel(AmbassadorModel);
    if (ConfigModel) this.configStore.setModel(ConfigModel);
  }

  bindFeatureFlags(featureFlags) {
    this.featureFlags = featureFlags;
    this.searchBridge.featureFlags = featureFlags;
    this.aiService.featureFlags = featureFlags;
  }

  bindObservability(observability) {
    this.observability = observability;
    if (this.campaignService) this.campaignService.observability = observability;
  }

  async initialize() {
    if (!this.initialized) {
      await this.configStore.initialize();
      this.initialized = true;
    }
    return this.health();
  }

  health() {
    return GrowthCommerceHealth.check(this);
  }

  getSettings() {
    return this.configStore.getSettings();
  }

  async updateSettings(partial, meta = {}) {
    return this.configStore.updateSettings(partial, meta);
  }
}

module.exports = GrowthCommercePlatform;
