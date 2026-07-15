const crypto = require("crypto");
const EventBusConfig = require("./EventBusConfig");
const { normalizeEventType } = require("./EventTypes");
const EventMetadata = require("./EventMetadata");
const EventContext = require("./EventContext");
const EventValidationError = require("./errors/EventValidationError");

/**
 * Domain event factory — immutable event records.
 */
class DomainEvent {
  static create(input = {}) {
    const eventType = normalizeEventType(input.eventType);
    const context = EventContext.fromInput(input);
    const aggregateId = DomainEvent._requiredString(input.aggregateId, "aggregateId");

    return Object.freeze({
      eventId: input.eventId || `evt_${crypto.randomUUID()}`,
      eventType,
      correlationId: context.correlationId,
      requestId: context.requestId,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
      version: input.version || EventBusConfig.envelopeVersion,
      aggregateType: String(input.aggregateType || EventBusConfig.defaultAggregateType).trim(),
      aggregateId,
      metadata: EventMetadata.withTrace(input.metadata || {}, context),
      payload: input.payload ?? {},
    });
  }

  static _requiredString(value, fieldName) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new EventValidationError(`${fieldName} is required`);
    }
    return normalized;
  }
}

module.exports = DomainEvent;
