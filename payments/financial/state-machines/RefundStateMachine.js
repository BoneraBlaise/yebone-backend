const RefundState = require("./RefundState");
const InvalidStateTransitionError = require("../errors/InvalidStateTransitionError");

/**
 * Formal refund lifecycle with enforced valid transitions.
 */
class RefundStateMachine {
  constructor() {
    this.transitions = {
      [RefundState.REQUESTED]: [
        RefundState.UNDER_REVIEW,
        RefundState.REJECTED,
      ],
      [RefundState.UNDER_REVIEW]: [
        RefundState.APPROVED,
        RefundState.REJECTED,
      ],
      [RefundState.APPROVED]: [RefundState.PROCESSING],
      [RefundState.REJECTED]: [],
      [RefundState.PROCESSING]: [
        RefundState.COMPLETED,
        RefundState.FAILED,
      ],
      [RefundState.COMPLETED]: [],
      [RefundState.FAILED]: [RefundState.REQUESTED],
    };
  }

  canTransition(fromState, toState) {
    const allowed = this.transitions[fromState] || [];
    return allowed.includes(toState);
  }

  transition(currentState, nextState) {
    if (!this.canTransition(currentState, nextState)) {
      throw new InvalidStateTransitionError("Refund", currentState, nextState);
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

module.exports = RefundStateMachine;
