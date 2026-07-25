const TrustBuyerProtectionRepository = require("./TrustBuyerProtectionRepository");
const TrustBuyerProtectionConfigStore = require("./TrustBuyerProtectionConfigStore");
const TrustOrdersBridge = require("./bridges/TrustOrdersBridge");
const TrustPaymentBridge = require("./bridges/TrustPaymentBridge");
const PolicyService = require("./services/PolicyService");
const BuyerProtectionService = require("./services/BuyerProtectionService");
const DisputeService = require("./services/DisputeService");
const EscrowService = require("./services/EscrowService");
const VerificationService = require("./services/VerificationService");
const TrustScoreService = require("./services/TrustScoreService");
const FraudDetectionService = require("./services/FraudDetectionService");
const AnalyticsService = require("./services/AnalyticsService");
const TrustBuyerProtectionHealth = require("./TrustBuyerProtectionHealth");
const PlatformAuditAdapter = require("../integration/audit/PlatformAuditAdapter");

class TrustBuyerProtectionPlatform {
  constructor(options = {}) {
    this.useMemoryOnly = Boolean(options.useMemoryOnly);
    this.featureFlags = options.featureFlags || null;
    this.observability = options.observability || null;

    this.repository = options.repository || new TrustBuyerProtectionRepository();
    this.configStore =
      options.configStore ||
      new TrustBuyerProtectionConfigStore({ useMemoryOnly: this.useMemoryOnly });

    const audit = { record: (payload) => PlatformAuditAdapter.record(payload) };

    this.ordersBridge =
      options.ordersBridge ||
      new TrustOrdersBridge({ repository: this.repository, orderPlatform: options.orderPlatform });
    this.paymentBridge = options.paymentBridge || new TrustPaymentBridge({ audit });

    this.policyService = options.policyService || new PolicyService({ configStore: this.configStore });

    this.buyerProtectionService =
      options.buyerProtectionService ||
      new BuyerProtectionService({
        repository: this.repository,
        configStore: this.configStore,
        ordersBridge: this.ordersBridge,
        policyService: this.policyService,
        audit,
      });

    this.escrowService =
      options.escrowService ||
      new EscrowService({
        repository: this.repository,
        ordersBridge: this.ordersBridge,
        paymentBridge: this.paymentBridge,
        policyService: this.policyService,
        audit,
      });

    this.disputeService =
      options.disputeService ||
      new DisputeService({
        repository: this.repository,
        ordersBridge: this.ordersBridge,
        buyerProtectionService: null,
        paymentBridge: this.paymentBridge,
        audit,
      });
    if (!options.disputeService) {
      this.disputeService.buyerProtectionService = this.buyerProtectionService;
    }

    this.verificationService =
      options.verificationService ||
      new VerificationService({
        repository: this.repository,
        configStore: this.configStore,
        policyService: this.policyService,
        audit,
      });

    this.trustScoreService =
      options.trustScoreService ||
      new TrustScoreService({
        repository: this.repository,
        policyService: this.policyService,
        verificationService: this.verificationService,
        audit,
      });

    this.fraudDetectionService =
      options.fraudDetectionService ||
      new FraudDetectionService({ repository: this.repository, audit });

    this.analyticsService =
      options.analyticsService || new AnalyticsService({ repository: this.repository });

    this.initialized = false;
  }

  setModels({ ConfigModel } = {}) {
    if (ConfigModel) this.configStore.setModel(ConfigModel);
  }

  bindFeatureFlags(featureFlags) {
    this.featureFlags = featureFlags;
  }

  bindObservability(observability) {
    this.observability = observability;
  }

  bindOrderPlatform(orderPlatform) {
    this.ordersBridge.orderPlatform = orderPlatform;
  }

  async initialize() {
    if (!this.initialized) {
      await this.configStore.initialize();
      this.initialized = true;
    }
    return this.health();
  }

  health() {
    return TrustBuyerProtectionHealth.check(this);
  }

  getSettings() {
    return this.configStore.getSettings();
  }

  getPolicies() {
    return this.configStore.getPolicies();
  }

  getTrustWeights() {
    return this.configStore.getTrustWeights();
  }

  async updateConfiguration(partial, meta = {}) {
    return this.configStore.updateConfiguration(partial, meta);
  }
}

module.exports = TrustBuyerProtectionPlatform;
