const EventBusConfig = require("./EventBusConfig");

/**
 * Metadata helpers for domain event envelopes.
 */
class EventMetadata {
  static sanitize(metadata = {}) {
    if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }
    const output = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined) {
        continue;
      }
      output[String(key)] = value;
    }
    return output;
  }

  static merge(base = {}, extra = {}) {
    return EventMetadata.sanitize({ ...base, ...extra });
  }

  static withTrace(metadata = {}, trace = {}) {
    return EventMetadata.merge(metadata, {
      traceId: trace.traceId || trace.correlationId || null,
      transactionId: trace.transactionId || null,
      paymentReference: trace.paymentReference || null,
      providerReference: trace.providerReference || null,
    });
  }

  static schemaVersion() {
    return EventBusConfig.envelopeVersion;
  }
}

module.exports = EventMetadata;
