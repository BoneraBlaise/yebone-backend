const PaymentConfig = require("./config/PaymentConfig");
const PaymentFactory = require("./config/PaymentFactory");
const ProviderResolver = require("./config/ProviderResolver");
const PaymentService = require("./services/PaymentService");
const { TransactionLedgerService } = require("./ledger");
const DeliveryPricingService = require("./delivery/DeliveryPricingService");
const {
  OrderPaymentWorkflow,
  VendorSubscriptionWorkflow,
  VendorPayoutWorkflow,
  EscrowWorkflow,
  WalletWorkflow,
  DeliveryPaymentWorkflow,
} = require("./workflows");
const {
  PaymentRepository,
  TransactionRepository,
  RefundRepository,
  PayoutRepository,
  WalletRepository,
} = require("./repositories");
const {
  FinancialRules,
  AccountingLedger,
  EscrowStateMachine,
  RefundStateMachine,
  VendorWalletEngine,
  VendorBalanceEngine,
  CommissionEngine,
  DeliverySettlementEngine,
  SettlementEngine,
  PayoutApprovalPipeline,
  FinancialAuditService,
} = require("./financial");
const {
  IdempotencyService,
  LockManager,
  RetryPolicy,
  RefundWorkflowAdapter,
  OrderTransactionOrchestrator,
  CheckoutOrchestrator,
  EscrowOrchestrator,
  RefundOrchestrator,
  SettlementOrchestrator,
  WalletOrchestrator,
  VendorSubscriptionOrchestrator,
  VendorPayoutOrchestrator,
  DeliveryPaymentOrchestrator,
  TransactionCoordinator,
  MarketplacePaymentFacade,
} = require("./orchestration");
const LegacyPaymentRoutingPolicy = require("./runtime/migration/LegacyPaymentRoutingPolicy");

/**
 * Composition root for payment foundation, financial, and orchestration layers.
 * Wire dependencies here; consumers receive configured services and workflows.
 */
class PaymentModule {
  constructor(options = {}) {
    this.config = options.config || new PaymentConfig();
    this.factory = options.factory || new PaymentFactory();
    this.providerResolver = new ProviderResolver({
      config: this.config,
      factory: this.factory,
    });

    this.paymentRepository = options.paymentRepository || new PaymentRepository();
    this.transactionRepository =
      options.transactionRepository || new TransactionRepository();
    this.refundRepository = options.refundRepository || new RefundRepository();
    this.payoutRepository = options.payoutRepository || new PayoutRepository();
    this.walletRepository = options.walletRepository || new WalletRepository();

    this.paymentService = new PaymentService({
      providerResolver: this.providerResolver,
      paymentRepository: this.paymentRepository,
      transactionRepository: this.transactionRepository,
      refundRepository: this.refundRepository,
      payoutRepository: this.payoutRepository,
      walletRepository: this.walletRepository,
    });

    this.ledger = new TransactionLedgerService({
      transactionRepository: this.transactionRepository,
    });

    this.deliveryPricingService =
      options.deliveryPricingService || new DeliveryPricingService();

    this.orderPaymentWorkflow = new OrderPaymentWorkflow({
      paymentService: this.paymentService,
      paymentRepository: this.paymentRepository,
      ledger: this.ledger,
    });

    this.vendorSubscriptionWorkflow = new VendorSubscriptionWorkflow({
      paymentService: this.paymentService,
      paymentRepository: this.paymentRepository,
      ledger: this.ledger,
    });

    this.vendorPayoutWorkflow = new VendorPayoutWorkflow({
      paymentService: this.paymentService,
      payoutRepository: this.payoutRepository,
      ledger: this.ledger,
    });

    this.escrowWorkflow = new EscrowWorkflow({
      paymentService: this.paymentService,
      ledger: this.ledger,
    });

    this.walletWorkflow = new WalletWorkflow({
      walletRepository: this.walletRepository,
      ledger: this.ledger,
    });

    this.deliveryPaymentWorkflow = new DeliveryPaymentWorkflow({
      deliveryPricingService: this.deliveryPricingService,
      ledger: this.ledger,
    });

    this.financialRules = options.financialRules || new FinancialRules();
    this.accountingLedger = options.accountingLedger || new AccountingLedger();
    this.financialAuditService =
      options.financialAuditService || new FinancialAuditService();
    this.escrowStateMachine = options.escrowStateMachine || new EscrowStateMachine();
    this.refundStateMachine = options.refundStateMachine || new RefundStateMachine();

    this.vendorWalletEngine = new VendorWalletEngine({
      financialRules: this.financialRules,
    });

    this.vendorBalanceEngine = new VendorBalanceEngine({
      financialRules: this.financialRules,
      vendorWalletEngine: this.vendorWalletEngine,
    });

    this.commissionEngine = new CommissionEngine({
      financialRules: this.financialRules,
    });

    this.deliverySettlementEngine = new DeliverySettlementEngine({
      financialRules: this.financialRules,
    });

    this.payoutApprovalPipeline = new PayoutApprovalPipeline({
      financialRules: this.financialRules,
    });

    this.settlementEngine = new SettlementEngine({
      paymentService: this.paymentService,
      commissionEngine: this.commissionEngine,
      deliverySettlementEngine: this.deliverySettlementEngine,
      vendorBalanceEngine: this.vendorBalanceEngine,
      accountingLedger: this.accountingLedger,
      financialRules: this.financialRules,
      auditService: this.financialAuditService,
      escrowStateMachine: this.escrowStateMachine,
    });

    this.idempotencyService = options.idempotencyService || new IdempotencyService();
    this.lockManager = options.lockManager || new LockManager();
    this.retryPolicy = options.retryPolicy || new RetryPolicy();

    this.refundWorkflow = new RefundWorkflowAdapter({
      orderPaymentWorkflow: this.orderPaymentWorkflow,
      escrowWorkflow: this.escrowWorkflow,
    });

    this.orderTransactionOrchestrator = new OrderTransactionOrchestrator({
      orderPaymentWorkflow: this.orderPaymentWorkflow,
      settlementEngine: this.settlementEngine,
      ledger: this.ledger,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.escrowOrchestrator = new EscrowOrchestrator({
      escrowWorkflow: this.escrowWorkflow,
      escrowStateMachine: this.escrowStateMachine,
      settlementEngine: this.settlementEngine,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.refundOrchestrator = new RefundOrchestrator({
      refundWorkflow: this.refundWorkflow,
      refundStateMachine: this.refundStateMachine,
      ledger: this.ledger,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.settlementOrchestrator = new SettlementOrchestrator({
      settlementEngine: this.settlementEngine,
      commissionEngine: this.commissionEngine,
      vendorBalanceEngine: this.vendorBalanceEngine,
      vendorWalletEngine: this.vendorWalletEngine,
      deliverySettlementEngine: this.deliverySettlementEngine,
      accountingLedger: this.accountingLedger,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
    });

    this.walletOrchestrator = new WalletOrchestrator({
      walletWorkflow: this.walletWorkflow,
      vendorWalletEngine: this.vendorWalletEngine,
      ledger: this.ledger,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.vendorSubscriptionOrchestrator = new VendorSubscriptionOrchestrator({
      vendorSubscriptionWorkflow: this.vendorSubscriptionWorkflow,
      commissionEngine: this.commissionEngine,
      vendorBalanceEngine: this.vendorBalanceEngine,
      ledger: this.ledger,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.vendorPayoutOrchestrator = new VendorPayoutOrchestrator({
      vendorPayoutWorkflow: this.vendorPayoutWorkflow,
      payoutApprovalPipeline: this.payoutApprovalPipeline,
      settlementEngine: this.settlementEngine,
      ledger: this.ledger,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.deliveryPaymentOrchestrator = new DeliveryPaymentOrchestrator({
      deliveryPaymentWorkflow: this.deliveryPaymentWorkflow,
      deliveryPricingService: this.deliveryPricingService,
      settlementEngine: this.settlementEngine,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
    });

    this.checkoutOrchestrator = new CheckoutOrchestrator({
      orderTransactionOrchestrator: this.orderTransactionOrchestrator,
      escrowOrchestrator: this.escrowOrchestrator,
      settlementOrchestrator: this.settlementOrchestrator,
      deliveryPaymentOrchestrator: this.deliveryPaymentOrchestrator,
      auditService: this.financialAuditService,
      idempotencyService: this.idempotencyService,
      lockManager: this.lockManager,
    });

    this.transactionCoordinator = new TransactionCoordinator({
      checkoutOrchestrator: this.checkoutOrchestrator,
      orderTransactionOrchestrator: this.orderTransactionOrchestrator,
      refundOrchestrator: this.refundOrchestrator,
      escrowOrchestrator: this.escrowOrchestrator,
      settlementOrchestrator: this.settlementOrchestrator,
      walletOrchestrator: this.walletOrchestrator,
      vendorSubscriptionOrchestrator: this.vendorSubscriptionOrchestrator,
      vendorPayoutOrchestrator: this.vendorPayoutOrchestrator,
      deliveryPaymentOrchestrator: this.deliveryPaymentOrchestrator,
      auditService: this.financialAuditService,
      retryPolicy: this.retryPolicy,
    });

    this.marketplacePaymentFacade = new MarketplacePaymentFacade({
      checkoutOrchestrator: this.checkoutOrchestrator,
      orderTransactionOrchestrator: this.orderTransactionOrchestrator,
      refundOrchestrator: this.refundOrchestrator,
      vendorPayoutOrchestrator: this.vendorPayoutOrchestrator,
      vendorSubscriptionOrchestrator: this.vendorSubscriptionOrchestrator,
      walletOrchestrator: this.walletOrchestrator,
      escrowOrchestrator: this.escrowOrchestrator,
      settlementOrchestrator: this.settlementOrchestrator,
      deliveryPaymentOrchestrator: this.deliveryPaymentOrchestrator,
      transactionCoordinator: this.transactionCoordinator,
    });

    this.paymentFoundation = options.paymentFoundation || null;
    this.legacyRoutingPolicy =
      options.legacyRoutingPolicy || new LegacyPaymentRoutingPolicy();
    this.paymentEngine =
      options.paymentEngine ||
      this.paymentFoundation?.engine ||
      null;
    this.providerExecutionOrchestrator =
      options.providerExecutionOrchestrator ||
      this.paymentFoundation?.providerExecutionOrchestrator ||
      null;
    this.webhookService =
      options.webhookService ||
      this.paymentFoundation?.webhookService ||
      null;
    this.foundationBridge = null;

    if (this.paymentEngine) {
      const PaymentModuleFoundationBridge = require("./PaymentModuleFoundationBridge");
      this.foundationBridge = new PaymentModuleFoundationBridge({
        paymentEngine: this.paymentEngine,
      });
    }

    const InfrastructureModule = require("./infrastructure/InfrastructureModule");
    this.infrastructureModule =
      options.infrastructureModule ||
      new InfrastructureModule({
        paymentModule: this,
        options: options.infrastructure || {},
      });
  }

  getPaymentService() {
    return this.paymentService;
  }

  getLedger() {
    return this.ledger;
  }

  getOrderPaymentWorkflow() {
    return this.orderPaymentWorkflow;
  }

  getVendorSubscriptionWorkflow() {
    return this.vendorSubscriptionWorkflow;
  }

  getVendorPayoutWorkflow() {
    return this.vendorPayoutWorkflow;
  }

  getEscrowWorkflow() {
    return this.escrowWorkflow;
  }

  getWalletWorkflow() {
    return this.walletWorkflow;
  }

  getDeliveryPaymentWorkflow() {
    return this.deliveryPaymentWorkflow;
  }

  getDeliveryPricingService() {
    return this.deliveryPricingService;
  }

  getConfig() {
    return this.config;
  }

  getFactory() {
    return this.factory;
  }

  getProviderResolver() {
    return this.providerResolver;
  }

  getFinancialRules() {
    return this.financialRules;
  }

  getAccountingLedger() {
    return this.accountingLedger;
  }

  getFinancialAuditService() {
    return this.financialAuditService;
  }

  getEscrowStateMachine() {
    return this.escrowStateMachine;
  }

  getRefundStateMachine() {
    return this.refundStateMachine;
  }

  getVendorWalletEngine() {
    return this.vendorWalletEngine;
  }

  getVendorBalanceEngine() {
    return this.vendorBalanceEngine;
  }

  getCommissionEngine() {
    return this.commissionEngine;
  }

  getDeliverySettlementEngine() {
    return this.deliverySettlementEngine;
  }

  getPayoutApprovalPipeline() {
    return this.payoutApprovalPipeline;
  }

  getSettlementEngine() {
    return this.settlementEngine;
  }

  getMarketplacePaymentFacade() {
    return this.marketplacePaymentFacade;
  }

  getTransactionCoordinator() {
    return this.transactionCoordinator;
  }

  getCheckoutOrchestrator() {
    return this.checkoutOrchestrator;
  }

  getOrderTransactionOrchestrator() {
    return this.orderTransactionOrchestrator;
  }

  getEscrowOrchestrator() {
    return this.escrowOrchestrator;
  }

  getRefundOrchestrator() {
    return this.refundOrchestrator;
  }

  getSettlementOrchestrator() {
    return this.settlementOrchestrator;
  }

  getWalletOrchestrator() {
    return this.walletOrchestrator;
  }

  getVendorSubscriptionOrchestrator() {
    return this.vendorSubscriptionOrchestrator;
  }

  getVendorPayoutOrchestrator() {
    return this.vendorPayoutOrchestrator;
  }

  getDeliveryPaymentOrchestrator() {
    return this.deliveryPaymentOrchestrator;
  }

  getIdempotencyService() {
    return this.idempotencyService;
  }

  getLockManager() {
    return this.lockManager;
  }

  getRetryPolicy() {
    return this.retryPolicy;
  }

  getInfrastructureModule() {
    return this.infrastructureModule;
  }

  getPaymentFoundation() {
    return this.paymentFoundation;
  }

  getPaymentEngine() {
    return this.paymentEngine;
  }

  getProviderExecutionOrchestrator() {
    return this.providerExecutionOrchestrator;
  }

  getPaymentFoundationBridge() {
    return this.foundationBridge;
  }

  getWebhookVerificationService() {
    return this.webhookService;
  }

  getLegacyPaymentRoutingPolicy() {
    return this.legacyRoutingPolicy;
  }

  isPaymentFoundationWired() {
    return Boolean(this.foundationBridge);
  }

  async executeFoundationCharge(input = {}, trace = {}) {
    if (!this.foundationBridge) {
      return null;
    }
    return this.foundationBridge.charge(input, trace);
  }

  async executeFoundationVerify(input = {}, trace = {}) {
    if (!this.foundationBridge) {
      return null;
    }
    return this.foundationBridge.verify(input, trace);
  }

  async executeFoundationPayout(input = {}, trace = {}) {
    if (!this.foundationBridge) {
      return null;
    }
    return this.foundationBridge.payout(input, trace);
  }

  async verifyProviderWebhook(input = {}) {
    if (!this.webhookService) {
      return null;
    }
    return this.webhookService.verifyWebhook(input);
  }
}

module.exports = PaymentModule;
