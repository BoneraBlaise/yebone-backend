const EventBusConfig = require("./EventBusConfig");
const DomainEvent = require("./DomainEvent");
const EventValidationError = require("./errors/EventValidationError");

const REQUIRED_FIELDS = [
  "eventId",
  "eventType",
  "correlationId",
  "requestId",
  "timestamp",
  "version",
  "aggregateType",
  "aggregateId",
  "metadata",
  "payload",
];

/**
 * Validates and normalizes event envelopes before publish/dispatch.
 */
class EventEnvelope {
  static create(input = {}) {
    const envelope = DomainEvent.create(input);
    EventEnvelope.validate(envelope);
    return envelope;
  }

  static validate(envelope) {
    if (!envelope || typeof envelope !== "object") {
      throw new EventValidationError("Envelope must be an object");
    }

    for (const field of REQUIRED_FIELDS) {
      if (envelope[field] === undefined || envelope[field] === null) {
        throw new EventValidationError(`Missing required envelope field: ${field}`);
      }
    }

    if (!(envelope.timestamp instanceof Date) || Number.isNaN(envelope.timestamp.getTime())) {
      throw new EventValidationError("timestamp must be a valid Date");
    }

    if (typeof envelope.metadata !== "object" || Array.isArray(envelope.metadata)) {
      throw new EventValidationError("metadata must be an object");
    }

    return true;
  }

  static toJSON(envelope) {
    EventEnvelope.validate(envelope);
    return {
      ...envelope,
      timestamp: envelope.timestamp.toISOString(),
    };
  }
}

module.exports = EventEnvelope;
