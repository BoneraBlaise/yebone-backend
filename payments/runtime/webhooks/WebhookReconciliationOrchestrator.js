const TransactionNotFoundError = require("../../infrastructure/transactions/errors/TransactionNotFoundError");
const InvalidStateTransitionError = require("../../financial/errors/InvalidStateTransitionError");
const TransactionCorrelationPolicy = require("./TransactionCorrelationPolicy");
const WebhookReconciliationResult = require("./WebhookReconciliationResult");
const WebhookTransactionStateMapper = require("./WebhookTransactionStateMapper");
const WebhookIdempotencyService = require("./WebhookIdempotencyService");
const WebhookReplayGuard = require("./WebhookReplayGuard");

/**
 * Post-verification webhook reconciliation orchestrator.
 * Verification stays outside Integration Gate (ADR-004).
 */
class WebhookReconciliationOrchestrator {
  constructor({
    transactionService,
    webhookIdempotencyService,
    eventPublisher = null,
    settlementBridge = null,
    replayGuard = null,
    logger = null,
    config = {},
  }) {
    if (!transactionService) {
      throw new Error("WebhookReconciliationOrchestrator requires transactionService");
    }
    if (!webhookIdempotencyService) {
      throw new Error("WebhookReconciliationOrchestrator requires webhookIdempotencyService");
    }

    this.transactionService = transactionService;
    this.webhookIdempotencyService = webhookIdempotencyService;
    this.eventPublisher = eventPublisher;
    this.settlementBridge = settlementBridge;
    this.replayGuard = replayGuard || new WebhookReplayGuard();
    this.logger = logger;
    this.config = config;
  }

  async process(input = {}) {
    const verified = WebhookReconciliationOrchestrator._isVerificationEligible(
      input.verification,
      input.verification?.executionMode || input.executionMode
    );
    const correlationChain = TransactionCorrelationPolicy.fromWebhookInput(input);
    const executionMode = input.verification?.executionMode || input.executionMode || null;

    if (!verified) {
      return WebhookReconciliationResult.verifyOnly({
        verified: false,
        correlationId: correlationChain.correlationId,
        executionMode,
        providerCode: input.providerCode,
        providerReference: correlationChain.providerReference,
        providerEventId: correlationChain.providerEventId,
        reason: input.verification?.status || "NOT_VERIFIED",
      });
    }

    if (this.config.enableWebhookReconciliation !== true) {
      return WebhookReconciliationResult.verifyOnly({
        verified,
        correlationId: correlationChain.correlationId,
        executionMode,
        providerCode: input.providerCode,
        mock: input.verification?.mock === true,
        providerReference: correlationChain.providerReference,
        providerEventId: correlationChain.providerEventId,
        reason: "VERIFIED_ONLY",
      });
    }

    const replay = this.replayGuard.assertWithinWindow({
      payload: input.payload,
      eventTimestamp: input.eventTimestamp,
    });

    if (!replay.allowed) {
      this.logger?.warn("Webhook replay rejected", {
        ...TransactionCorrelationPolicy.toLogContext(correlationChain),
        replayReason: replay.reason,
      });
      return WebhookReconciliationResult.replayRejected({
        correlationId: correlationChain.correlationId,
        executionMode,
        providerReference: correlationChain.providerReference,
        providerEventId: correlationChain.providerEventId,
      });
    }

    const cached = await this.webhookIdempotencyService.executeOnce(
      {
        ...input,
        verified: true,
        providerCode: input.providerCode,
        executionMode,
      },
      async () => {
        const result = await this._reconcileOnce({
          ...input,
          correlationChain,
          executionMode,
        });
        return WebhookIdempotencyService.wrapResult(result);
      }
    );

    return cached;
  }

  async _reconcileOnce({ correlationChain, payload, verification, providerCode, executionMode }) {
    const targetStatus = WebhookTransactionStateMapper.resolveTargetStatus({
      payload,
      verification,
    });

    if (!targetStatus) {
      return WebhookReconciliationResult.create({
        accepted: true,
        verified: true,
        duplicate: false,
        replay: false,
        reconciled: false,
        settlementExecuted: false,
        correlationId: correlationChain.correlationId,
        providerReference: correlationChain.providerReference,
        providerEventId: correlationChain.providerEventId,
        executionMode,
        reason: "UNMAPPED_STATUS",
      });
    }

    let transaction;
    try {
      if (correlationChain.providerReference) {
        transaction = await this.transactionService.getByProviderReference(
          correlationChain.providerReference
        );
      } else if (payload.paymentReference || payload.reference) {
        transaction = await this.transactionService.getByPaymentReference(
          payload.paymentReference || payload.reference
        );
      } else {
        throw new TransactionNotFoundError("missing reference");
      }
    } catch (error) {
      if (error instanceof TransactionNotFoundError) {
        this.logger?.warn("Webhook transaction not found", TransactionCorrelationPolicy.toLogContext(correlationChain));
        return WebhookReconciliationResult.create({
          accepted: true,
          verified: true,
          duplicate: false,
          replay: false,
          reconciled: false,
          settlementExecuted: false,
          correlationId: correlationChain.correlationId,
          providerReference: correlationChain.providerReference,
          providerEventId: correlationChain.providerEventId,
          executionMode,
          currentStatus: null,
          reason: "TRANSACTION_NOT_FOUND",
        });
      }
      throw error;
    }

    const previousStatus = transaction.status;
    let updated = transaction;
    let chain = TransactionCorrelationPolicy.enrich(correlationChain, {
      transactionId: transaction.transactionId,
      providerReference: transaction.providerReference || correlationChain.providerReference,
    });

    try {
      updated = await this.transactionService.transitionStatus(
        transaction.transactionId,
        targetStatus,
        {
          providerCode,
          providerReference: chain.providerReference,
          metadata: {
            webhookReconciliation: true,
            providerEventId: chain.providerEventId,
            correlationId: chain.correlationId,
          },
        }
      );
    } catch (error) {
      if (error instanceof InvalidStateTransitionError) {
        this.logger?.warn("Webhook illegal transition", {
          ...TransactionCorrelationPolicy.toLogContext(chain),
          previousStatus,
          targetStatus,
        });
        return WebhookReconciliationResult.create({
          accepted: true,
          verified: true,
          duplicate: false,
          replay: false,
          reconciled: false,
          settlementExecuted: false,
          correlationId: chain.correlationId,
          transactionId: transaction.transactionId,
          providerReference: chain.providerReference,
          providerEventId: chain.providerEventId,
          executionMode,
          previousStatus,
          currentStatus: previousStatus,
          reason: "INVALID_TRANSITION",
        });
      }
      throw error;
    }

    const reconciled = updated.status !== previousStatus || updated.status === targetStatus;
    let settlementExecuted = false;
    let ledgerEntryIds = [];
    let eventIds = [];
    let auditId = chain.auditId;

    if (this.eventPublisher) {
      const published = await this.eventPublisher.publishForTransition({
        correlationChain: chain,
        transaction: updated,
        previousStatus,
        currentStatus: updated.status,
        providerCode,
      });
      chain = published.correlationChain;
      eventIds = published.eventIds;
      auditId = published.auditId;
    }

    if (
      this.config.enableWebhookSettlement === true &&
      this.settlementBridge &&
      (updated.status === "CAPTURED" || updated.status === "SETTLED")
    ) {
      const settlement = await this.settlementBridge.run({
        transaction: updated,
        correlationChain: chain,
        providerCode,
      });
      settlementExecuted = settlement.settlementExecuted;
      ledgerEntryIds = settlement.ledgerEntryIds;
      chain = settlement.correlationChain;
      updated = settlement.transaction;
      auditId = settlement.auditId || auditId;
      if (settlement.eventId) {
        eventIds = [...eventIds, settlement.eventId];
      }
    }

    this.logger?.info("Webhook reconciled", TransactionCorrelationPolicy.toLogContext(chain));

    return WebhookReconciliationResult.create({
      accepted: true,
      verified: true,
      duplicate: false,
      replay: false,
      reconciled,
      settlementExecuted,
      previousStatus,
      currentStatus: updated.status,
      transactionId: updated.transactionId,
      providerReference: chain.providerReference,
      providerEventId: chain.providerEventId,
      correlationId: chain.correlationId,
      executionMode,
      providerCode,
      eventIds,
      ledgerEntryIds,
      auditId,
      reason: reconciled ? "RECONCILED" : "NO_STATUS_CHANGE",
    });
  }

  static _isVerificationEligible(verification = {}, executionMode = null) {
    if (verification.verified === true) {
      return true;
    }
    const mode = executionMode || verification.executionMode;
    return verification.mock === true && mode === "MOCK";
  }
}

module.exports = WebhookReconciliationOrchestrator;
