const { EventTypes } = require("../../infrastructure/events");
const TransactionCorrelationPolicy = require("./TransactionCorrelationPolicy");

/**
 * Publishes domain events after verified webhook reconciliation.
 */
class WebhookEventPublisher {
  constructor({ eventBus, auditService = null }) {
    if (!eventBus) {
      throw new Error("WebhookEventPublisher requires eventBus");
    }
    this.eventBus = eventBus;
    this.auditService = auditService;
  }

  async publishForTransition({
    correlationChain,
    transaction,
    previousStatus,
    currentStatus,
    providerCode,
  }) {
    const trace = TransactionCorrelationPolicy.toEventTrace(correlationChain);
    const eventIds = [];
    let auditId = correlationChain.auditId || null;

    const domainEventType = WebhookEventPublisher._mapStatusToEvent(currentStatus);
    if (domainEventType) {
      const eventId = await this.eventBus.publish({
        eventType: domainEventType,
        aggregateId: transaction.transactionId,
        correlationId: trace.correlationId,
        requestId: trace.requestId,
        payload: {
          transactionId: transaction.transactionId,
          orderId: transaction.orderId,
          buyerId: transaction.buyerId,
          sellerId: transaction.sellerId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: currentStatus,
          previousStatus,
          providerCode,
          providerReference: transaction.providerReference,
          providerEventId: correlationChain.providerEventId,
        },
        metadata: {
          source: "webhook_reconciliation",
          providerEventId: correlationChain.providerEventId,
        },
      });
      eventIds.push(eventId);
    }

    const updateEventId = await this.eventBus.publish({
      eventType: EventTypes.TRANSACTION_UPDATED,
      aggregateId: transaction.transactionId,
      correlationId: trace.correlationId,
      requestId: trace.requestId,
      payload: {
        transactionId: transaction.transactionId,
        previousStatus,
        currentStatus,
        providerCode,
        providerReference: transaction.providerReference,
      },
      metadata: {
        source: "webhook_reconciliation",
        providerEventId: correlationChain.providerEventId,
      },
    });
    eventIds.push(updateEventId);

    if (this.auditService && !auditId) {
      const auditRecord = await this.auditService.record({
        action: "WEBHOOK_RECONCILED",
        actorType: "SYSTEM",
        actorId: providerCode || "WEBHOOK",
        resourceType: "TRANSACTION",
        resourceId: transaction.transactionId,
        after: {
          status: currentStatus,
          previousStatus,
          providerReference: transaction.providerReference,
        },
        context: {
          correlationId: trace.correlationId,
          requestId: trace.requestId,
        },
        metadata: TransactionCorrelationPolicy.toLogContext(correlationChain),
      });
      auditId = auditRecord.auditId || auditRecord.id || null;
    }

    return Object.freeze({
      eventIds,
      auditId,
      correlationChain: TransactionCorrelationPolicy.enrich(correlationChain, {
        eventId: eventIds[0] || correlationChain.eventId,
        auditId,
        transactionId: transaction.transactionId,
      }),
    });
  }

  static _mapStatusToEvent(status) {
    const map = {
      PENDING: EventTypes.PAYMENT_PENDING,
      AUTHORIZED: EventTypes.PAYMENT_AUTHORIZED,
      CAPTURED: EventTypes.PAYMENT_CAPTURED,
      SETTLED: EventTypes.PAYMENT_SETTLED,
      FAILED: EventTypes.PAYMENT_FAILED,
      CANCELLED: EventTypes.PAYMENT_CANCELLED,
      REFUNDED: EventTypes.PAYMENT_REFUNDED,
      PARTIALLY_REFUNDED: EventTypes.PAYMENT_PARTIALLY_REFUNDED,
    };
    return map[status] || null;
  }
}

module.exports = WebhookEventPublisher;
