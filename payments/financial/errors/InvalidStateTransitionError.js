/**
 * Thrown when an invalid financial state transition is attempted.
 */
class InvalidStateTransitionError extends Error {
  constructor(entity, fromState, toState) {
    super(`Invalid ${entity} transition: ${fromState} -> ${toState}`);
    this.name = "InvalidStateTransitionError";
    this.entity = entity;
    this.fromState = fromState;
    this.toState = toState;
  }
}

module.exports = InvalidStateTransitionError;
