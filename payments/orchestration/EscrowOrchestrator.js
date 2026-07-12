const EscrowState = require("../financial/state-machines/EscrowState");
const { EscrowCreated, EscrowReleased, EscrowRefunded } = require("../financial/events/FinancialEvents");

/**
 * Coordinates escrow lifecycle — no provider execution.
 */
class EscrowOrchestrator {
  constructor({
    escrowWorkflow,
    escrowStateMachine,
    settlementEngine,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.escrowWorkflow = escrowWorkflow;
    this.escrowStateMachine = escrowStateMachine;
    this.settlementEngine = settlementEngine;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  _lockKey(orderId) {
    return `escrow:${orderId}`;
  }

  async hold(input) {
    const key = input.idempotencyKey || `escrow-hold:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        const state = this.escrowStateMachine.transition(EscrowState.CREATED, EscrowState.AUTHORIZED);
        const heldState = this.escrowStateMachine.transition(state, EscrowState.HELD);
        this.auditService.recordEscrow("escrow_hold", input.orderId, { ...input, state: heldState });
        const workflowResult = await this.escrowWorkflow.holdFunds(input);
        const settlement = input.settlement
          ? this.settlementEngine.settleOrder(input.settlement)
          : null;
        return {
          coordinated: true,
          state: heldState,
          events: [new EscrowCreated(input.orderId, { state: heldState, amount: input.amount })],
          workflowResult,
          settlement,
        };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async release(input) {
    const key = input.idempotencyKey || `escrow-release:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        const readyState = this.escrowStateMachine.transition(
          input.currentState || EscrowState.HELD,
          EscrowState.READY_FOR_RELEASE
        );
        const releasedState = this.escrowStateMachine.transition(readyState, EscrowState.RELEASED);
        this.auditService.recordEscrow("escrow_release", input.orderId, { ...input, state: releasedState });
        const workflowResult = await this.escrowWorkflow.releaseFunds(input);
        return {
          coordinated: true,
          state: releasedState,
          events: [new EscrowReleased(input.orderId, { amount: input.amount, vendorId: input.vendorId })],
          workflowResult,
        };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async dispute(input) {
    const key = input.idempotencyKey || `escrow-dispute:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        const disputedState = this.escrowStateMachine.transition(
          input.currentState || EscrowState.HELD,
          EscrowState.DISPUTED
        );
        this.auditService.recordEscrow("escrow_dispute", input.orderId, { ...input, state: disputedState });
        const workflowResult = await this.escrowWorkflow.disputeFunds(input);
        return { coordinated: true, state: disputedState, workflowResult };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async refund(input) {
    const key = input.idempotencyKey || `escrow-refund:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        const fromState = input.currentState || EscrowState.HELD;
        const targetState =
          input.amount < input.totalAmount
            ? EscrowState.PARTIALLY_REFUNDED
            : EscrowState.FULLY_REFUNDED;
        const refundedState = this.escrowStateMachine.transition(fromState, targetState);
        this.auditService.recordEscrow("escrow_refund", input.orderId, { ...input, state: refundedState });
        const workflowResult = await this.escrowWorkflow.refundEscrow(input);
        return {
          coordinated: true,
          state: refundedState,
          events: [new EscrowRefunded(input.orderId, { amount: input.amount, reason: input.reason })],
          workflowResult,
        };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }
}

module.exports = EscrowOrchestrator;
