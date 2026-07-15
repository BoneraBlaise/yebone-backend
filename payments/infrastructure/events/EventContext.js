const crypto = require("crypto");

/**
 * Extracts trace context for event envelopes.
 */
class EventContext {
  static fromInput(input = {}) {
    const correlationId =
      input.correlationId || input.metadata?.correlationId || crypto.randomUUID();
    const requestId = input.requestId || input.metadata?.requestId || crypto.randomUUID();

    return Object.freeze({
      correlationId: String(correlationId).trim(),
      requestId: String(requestId).trim(),
      traceId: String(input.traceId || input.metadata?.traceId || correlationId).trim(),
    });
  }

  static toEnvelopeFields(context) {
    return {
      correlationId: context.correlationId,
      requestId: context.requestId,
    };
  }
}

module.exports = EventContext;
