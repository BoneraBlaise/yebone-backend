const { WalletReserved, WalletReleased } = require("../financial/events/FinancialEvents");

/**
 * Coordinates wallet workflow, vendor wallet engine, and ledger.
 */
class WalletOrchestrator {
  constructor({
    walletWorkflow,
    vendorWalletEngine,
    ledger,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.walletWorkflow = walletWorkflow;
    this.vendorWalletEngine = vendorWalletEngine;
    this.ledger = ledger;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  _lockKey(ownerId) {
    return `wallet:${ownerId}`;
  }

  async credit(input) {
    const key = input.idempotencyKey || `wallet-credit:${input.ownerId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.ownerId));
      try {
        this.auditService.recordWallet("wallet_credit", input.ownerId, input);
        const workflowResult = await this.walletWorkflow.creditWallet(input);
        const ledgerEntry = await this.ledger.recordWalletMovement({
          ownerId: input.ownerId,
          amount: input.amount,
          currency: input.currency,
          description: input.reason,
          metadata: input.metadata,
        });
        const snapshot = this.vendorWalletEngine.calculateSnapshot(
          input.currentSnapshot || { availableBalance: input.amount }
        );
        return { coordinated: true, workflowResult, ledgerEntry, snapshot };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.ownerId), lock.token);
      }
    });
  }

  async debit(input) {
    const key = input.idempotencyKey || `wallet-debit:${input.ownerId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.ownerId));
      try {
        this.auditService.recordWallet("wallet_debit", input.ownerId, input);
        const workflowResult = await this.walletWorkflow.debitWallet(input);
        const ledgerEntry = await this.ledger.recordWalletMovement({
          ownerId: input.ownerId,
          amount: input.amount,
          currency: input.currency,
          description: input.reason,
          metadata: input.metadata,
        });
        return { coordinated: true, workflowResult, ledgerEntry };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.ownerId), lock.token);
      }
    });
  }

  async reserve(input) {
    const key = input.idempotencyKey || `wallet-reserve:${input.ownerId}:${input.referenceId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.ownerId));
      try {
        this.auditService.recordWallet("wallet_reserve", input.ownerId, input);
        const workflowResult = await this.walletWorkflow.reserveWalletBalance(input);
        const snapshot = this.vendorWalletEngine.applyReserve(
          input.currentSnapshot || { availableBalance: 0, reservedBalance: 0 },
          input.amount
        );
        return {
          coordinated: true,
          workflowResult,
          snapshot,
          events: [new WalletReserved(input.ownerId, input)],
        };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.ownerId), lock.token);
      }
    });
  }

  async release(input) {
    const key = input.idempotencyKey || `wallet-release:${input.ownerId}:${input.referenceId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.ownerId));
      try {
        this.auditService.recordWallet("wallet_release", input.ownerId, input);
        const workflowResult = await this.walletWorkflow.releaseReservedBalance(input);
        const snapshot = this.vendorWalletEngine.applyReleaseReserve(
          input.currentSnapshot || { availableBalance: 0, reservedBalance: input.amount },
          input.amount
        );
        return {
          coordinated: true,
          workflowResult,
          snapshot,
          events: [new WalletReleased(input.ownerId, input)],
        };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.ownerId), lock.token);
      }
    });
  }
}

module.exports = WalletOrchestrator;
