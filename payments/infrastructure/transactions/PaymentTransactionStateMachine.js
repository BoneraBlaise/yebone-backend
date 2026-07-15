const PaymentTransactionStatus = require("./PaymentTransactionStatus");
const InvalidStateTransitionError = require("../../financial/errors/InvalidStateTransitionError");

const S = PaymentTransactionStatus;

/**
 * Validates payment transaction state transitions.
 */
class PaymentTransactionStateMachine {
  constructor() {
    this.transitions = {
      [S.CREATED]: [S.PENDING, S.AUTHORIZED, S.FAILED, S.CANCELLED, S.EXPIRED],
      [S.PENDING]: [
        S.AUTHORIZED,
        S.CAPTURED,
        S.FAILED,
        S.CANCELLED,
        S.EXPIRED,
      ],
      [S.AUTHORIZED]: [S.CAPTURED, S.FAILED, S.CANCELLED, S.EXPIRED],
      [S.CAPTURED]: [
        S.SETTLED,
        S.REFUNDED,
        S.PARTIALLY_REFUNDED,
        S.FAILED,
      ],
      [S.SETTLED]: [S.REFUNDED, S.PARTIALLY_REFUNDED],
      [S.PARTIALLY_REFUNDED]: [S.REFUNDED, S.PARTIALLY_REFUNDED],
      [S.FAILED]: [],
      [S.CANCELLED]: [],
      [S.REFUNDED]: [],
      [S.EXPIRED]: [],
    };
  }

  canTransition(fromState, toState) {
    if (fromState === toState) {
      return true;
    }
    const allowed = this.transitions[fromState] || [];
    return allowed.includes(toState);
  }

  transition(currentState, nextState) {
    if (currentState === nextState) {
      return nextState;
    }
    if (!this.canTransition(currentState, nextState)) {
      throw new InvalidStateTransitionError(
        "PaymentTransaction",
        currentState,
        nextState
      );
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

module.exports = PaymentTransactionStateMachine;
