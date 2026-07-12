const RefundState = require("../financial/state-machines/RefundState");
const { PaymentStatus } = require("../enums");
const {
  RefundRequested,
  RefundApproved,
  RefundCompleted,
} = require("../financial/events/FinancialEvents");

/**
 * Coordinates refund workflow, state machine, ledger, and audit.
 */
class RefundOrchestrator {
  constructor({
    refundWorkflow,
    refundStateMachine,
    ledger,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.refundWorkflow = refundWorkflow;
    this.refundStateMachine = refundStateMachine;
    this.ledger = ledger;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  async request(input) {
    const key = input.idempotencyKey || `refund-request:${input.paymentId || input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`refund:${input.paymentId || input.orderId}`);
      try {
        const state = RefundState.REQUESTED;
        this.auditService.recordRefund("refund_requested", input.paymentId || input.orderId, input);
        const workflowResult = await this.refundWorkflow.requestRefund(input);
        return {
          coordinated: true,
          state,
          events: [new RefundRequested(input.paymentId || input.orderId, input)],
          workflowResult,
        };
      } finally {
        this.lockManager.releaseLock(`refund:${input.paymentId || input.orderId}`, lock.token);
      }
    });
  }

  async review(input) {
    const key = input.idempotencyKey || `refund-review:${input.paymentId || input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const state = this.refundStateMachine.transition(RefundState.REQUESTED, RefundState.UNDER_REVIEW);
      this.auditService.recordRefund("refund_under_review", input.paymentId || input.orderId, input);
      return { coordinated: true, state };
    });
  }

  async approve(input) {
    const key = input.idempotencyKey || `refund-approve:${input.paymentId || input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`refund:${input.paymentId || input.orderId}`);
      try {
        const underReview = this.refundStateMachine.transition(
          input.currentState || RefundState.REQUESTED,
          RefundState.UNDER_REVIEW
        );
        const approved = this.refundStateMachine.transition(underReview, RefundState.APPROVED);
        this.auditService.recordRefund("refund_approved", input.paymentId || input.orderId, input);
        return {
          coordinated: true,
          state: approved,
          events: [new RefundApproved(input.paymentId || input.orderId, input)],
        };
      } finally {
        this.lockManager.releaseLock(`refund:${input.paymentId || input.orderId}`, lock.token);
      }
    });
  }

  async complete(input) {
    const key = input.idempotencyKey || `refund-complete:${input.paymentId || input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`refund:${input.paymentId || input.orderId}`);
      try {
        const processing = this.refundStateMachine.transition(RefundState.APPROVED, RefundState.PROCESSING);
        const completed = this.refundStateMachine.transition(processing, RefundState.COMPLETED);
        this.auditService.recordRefund("refund_completed", input.paymentId || input.orderId, input);
        const workflowResult = await this.refundWorkflow.requestRefund(input);
        const ledgerEntry = await this.ledger.recordRefund({
          paymentId: input.paymentId,
          refundId: input.refundId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.REFUNDED,
          metadata: input.metadata,
        });
        return {
          coordinated: true,
          state: completed,
          events: [new RefundCompleted(input.paymentId || input.orderId, input)],
          workflowResult,
          ledgerEntry,
        };
      } finally {
        this.lockManager.releaseLock(`refund:${input.paymentId || input.orderId}`, lock.token);
      }
    });
  }
}

module.exports = RefundOrchestrator;
