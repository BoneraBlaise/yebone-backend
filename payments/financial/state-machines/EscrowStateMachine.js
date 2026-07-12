const EscrowState = require("./EscrowState");
const InvalidStateTransitionError = require("../errors/InvalidStateTransitionError");

/**
 * Formal escrow lifecycle with enforced valid transitions.
 */
class EscrowStateMachine {
  constructor() {
    this.transitions = {
      [EscrowState.CREATED]: [
        EscrowState.AUTHORIZED,
        EscrowState.CANCELLED,
        EscrowState.FAILED,
      ],
      [EscrowState.AUTHORIZED]: [
        EscrowState.HELD,
        EscrowState.CANCELLED,
        EscrowState.FAILED,
      ],
      [EscrowState.HELD]: [
        EscrowState.READY_FOR_RELEASE,
        EscrowState.DISPUTED,
        EscrowState.PARTIALLY_REFUNDED,
        EscrowState.FULLY_REFUNDED,
        EscrowState.CANCELLED,
      ],
      [EscrowState.READY_FOR_RELEASE]: [
        EscrowState.RELEASED,
        EscrowState.DISPUTED,
        EscrowState.CANCELLED,
      ],
      [EscrowState.RELEASED]: [EscrowState.PARTIALLY_REFUNDED, EscrowState.DISPUTED],
      [EscrowState.DISPUTED]: [
        EscrowState.HELD,
        EscrowState.PARTIALLY_REFUNDED,
        EscrowState.FULLY_REFUNDED,
        EscrowState.CANCELLED,
      ],
      [EscrowState.PARTIALLY_REFUNDED]: [
        EscrowState.FULLY_REFUNDED,
        EscrowState.DISPUTED,
      ],
      [EscrowState.FULLY_REFUNDED]: [],
      [EscrowState.CANCELLED]: [],
      [EscrowState.FAILED]: [],
    };
  }

  canTransition(fromState, toState) {
    const allowed = this.transitions[fromState] || [];
    return allowed.includes(toState);
  }

  transition(currentState, nextState) {
    if (!this.canTransition(currentState, nextState)) {
      throw new InvalidStateTransitionError("Escrow", currentState, nextState);
    }
    return nextState;
  }

  getAllowedTransitions(state) {
    return [...(this.transitions[state] || [])];
  }

  isTerminal(state) {
    return (this.transitions[state] || []).length === 0;
  }
}

module.exports = EscrowStateMachine;
