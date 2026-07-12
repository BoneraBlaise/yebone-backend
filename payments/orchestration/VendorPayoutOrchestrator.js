const PayoutApprovalStage = require("../financial/pipelines/PayoutApprovalStage");
const { PayoutApproved } = require("../financial/events/FinancialEvents");
const { PayoutStatus } = require("../enums");

/**
 * Coordinates vendor payout workflow, approval pipeline, settlement, ledger, and audit.
 */
class VendorPayoutOrchestrator {
  constructor({
    vendorPayoutWorkflow,
    payoutApprovalPipeline,
    settlementEngine,
    ledger,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.vendorPayoutWorkflow = vendorPayoutWorkflow;
    this.payoutApprovalPipeline = payoutApprovalPipeline;
    this.settlementEngine = settlementEngine;
    this.ledger = ledger;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  async request(input) {
    const key = input.idempotencyKey || `payout-request:${input.vendorId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`payout:${input.vendorId}`);
      try {
        const stage = this.payoutApprovalPipeline.advance(
          PayoutApprovalStage.REQUESTED,
          PayoutApprovalStage.RISK_REVIEW,
          { amount: input.amount }
        );
        this.auditService.recordPayout("payout_requested", input.vendorId, input);
        const workflowResult = await this.vendorPayoutWorkflow.queueVendorPayout(input);
        const ledgerEntry = await this.ledger.recordPayout({
          vendorId: input.vendorId,
          payoutId: input.payoutId,
          amount: input.amount,
          currency: input.currency,
          status: PayoutStatus.PENDING,
          metadata: input.metadata,
        });
        return { coordinated: true, stage, workflowResult, ledgerEntry };
      } finally {
        this.lockManager.releaseLock(`payout:${input.vendorId}`, lock.token);
      }
    });
  }

  async approve(input) {
    const key = input.idempotencyKey || `payout-approve:${input.payoutId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`payout:${input.vendorId}`);
      try {
        const riskStage = this.payoutApprovalPipeline.advance(
          input.currentStage || PayoutApprovalStage.RISK_REVIEW,
          PayoutApprovalStage.MANUAL_REVIEW,
          { amount: input.amount }
        );
        const approvedStage = this.payoutApprovalPipeline.advance(
          PayoutApprovalStage.MANUAL_REVIEW,
          PayoutApprovalStage.APPROVED,
          { amount: input.amount }
        );
        this.auditService.recordPayout("payout_approved", input.vendorId, input);
        const workflowResult = await this.vendorPayoutWorkflow.approveVendorPayout(input);
        return {
          coordinated: true,
          stages: [riskStage, approvedStage],
          events: [new PayoutApproved(input.vendorId, input)],
          workflowResult,
          settlementReference: input.orderId
            ? { orderId: input.orderId, engine: "SettlementEngine" }
            : null,
        };
      } finally {
        this.lockManager.releaseLock(`payout:${input.vendorId}`, lock.token);
      }
    });
  }

  async execute(input) {
    const key = input.idempotencyKey || `payout-execute:${input.payoutId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`payout:${input.vendorId}`);
      try {
        const processingStage = this.payoutApprovalPipeline.advance(
          PayoutApprovalStage.APPROVED,
          PayoutApprovalStage.PROCESSING,
          { amount: input.amount }
        );
        this.auditService.recordPayout("payout_execute", input.vendorId, input);
        const workflowResult = await this.vendorPayoutWorkflow.executeVendorPayout(input);
        const completedStage = this.payoutApprovalPipeline.advance(
          PayoutApprovalStage.PROCESSING,
          PayoutApprovalStage.COMPLETED,
          { amount: input.amount }
        );
        const ledgerEntry = await this.ledger.recordPayout({
          vendorId: input.vendorId,
          payoutId: input.payoutId,
          amount: input.amount,
          currency: input.currency,
          status: PayoutStatus.COMPLETED,
          metadata: input.metadata,
        });
        return { coordinated: true, stages: [processingStage, completedStage], workflowResult, ledgerEntry };
      } finally {
        this.lockManager.releaseLock(`payout:${input.vendorId}`, lock.token);
      }
    });
  }
}

module.exports = VendorPayoutOrchestrator;
