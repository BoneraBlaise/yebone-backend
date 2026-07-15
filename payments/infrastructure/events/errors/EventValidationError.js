class EventValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "EventValidationError";
    this.code = "EVENT_VALIDATION_ERROR";
    this.details = details;
  }
}

module.exports = EventValidationError;
