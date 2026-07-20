const PropertyMobilityRepository = require("./PropertyMobilityRepository");
const PropertyMobilityConfigStore = require("./PropertyMobilityConfigStore");
const PropertyMobilityInboxBridge = require("./PropertyMobilityInboxBridge");
const PropertyMobilitySearchBridge = require("./PropertyMobilitySearchBridge");
const PropertyMobilityPromotionBridge = require("./PropertyMobilityPromotionBridge");
const ListingService = require("./ListingService");
const VerificationService = require("./VerificationService");
const AgencyService = require("./AgencyService");
const OfferService = require("./OfferService");
const ReportService = require("./ReportService");
const ModerationService = require("./ModerationService");
const PropertyMobilityHealth = require("./PropertyMobilityHealth");
const PlatformAuditAdapter = require("../integration/audit/PlatformAuditAdapter");

class PropertyMobilityPlatform {
  constructor(options = {}) {
    this.useMemoryOnly = Boolean(options.useMemoryOnly);
    this.featureFlags = options.featureFlags || null;
    this.observability = options.observability || null;

    this.repository = options.repository || new PropertyMobilityRepository();
    this.configStore =
      options.configStore || new PropertyMobilityConfigStore({ useMemoryOnly: this.useMemoryOnly });
    this.inboxBridge =
      options.inboxBridge ||
      new PropertyMobilityInboxBridge({ useMemoryOnly: this.useMemoryOnly, repository: this.repository });

    const audit = { record: (payload) => PlatformAuditAdapter.record(payload) };

    this.searchBridge =
      options.searchBridge ||
      new PropertyMobilitySearchBridge({ repository: this.repository, featureFlags: this.featureFlags });

    this.promotionBridge =
      options.promotionBridge ||
      new PropertyMobilityPromotionBridge({
        repository: this.repository,
        configStore: this.configStore,
        audit,
        featureFlags: this.featureFlags,
      });

    this.listingService = options.listingService || new ListingService({ repository: this.repository, audit });
    this.verificationService =
      options.verificationService ||
      new VerificationService({ repository: this.repository, configStore: this.configStore, audit });
    this.agencyService =
      options.agencyService ||
      new AgencyService({ repository: this.repository, configStore: this.configStore, audit });
    this.offerService =
      options.offerService ||
      new OfferService({ repository: this.repository, inboxBridge: this.inboxBridge, audit });
    this.reportService = options.reportService || new ReportService({ repository: this.repository, audit });
    this.moderationService =
      options.moderationService ||
      new ModerationService({
        repository: this.repository,
        audit,
        promotionBridge: this.promotionBridge,
      });

    this.initialized = false;
  }

  setModels({ ConfigModel } = {}) {
    if (ConfigModel) this.configStore.setModel(ConfigModel);
  }

  bindFeatureFlags(featureFlags) {
    this.featureFlags = featureFlags;
    this.searchBridge.featureFlags = featureFlags;
    this.promotionBridge.featureFlags = featureFlags;
  }

  bindObservability(observability) {
    this.observability = observability;
  }

  async initialize() {
    if (!this.initialized) {
      await this.configStore.initialize();
      this.initialized = true;
    }
    return this.health();
  }

  health() {
    return PropertyMobilityHealth.check(this);
  }

  getSettings() {
    return this.configStore.getSettings();
  }

  getPricing() {
    return this.configStore.getPricing();
  }

  getFeatureToggles() {
    return this.configStore.getFeatureToggles();
  }

  async updateConfiguration(partial, meta = {}) {
    return this.configStore.updateConfiguration(partial, meta);
  }
}

module.exports = PropertyMobilityPlatform;
