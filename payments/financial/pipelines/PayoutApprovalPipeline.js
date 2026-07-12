const PayoutApprovalStage = require("./PayoutApprovalStage");
const InvalidStateTransitionError = require("../errors/InvalidStateTransitionError");

/**
 * Payout approval pipeline with enforced stage transitions.
 */
class PayoutApprovalPipeline {
  constructor({ financialRules }) {
    this.financialRules = financialRules;
    this.transitions = {
      [PayoutApprovalStage.REQUESTED]: [
        PayoutApprovalStage.RISK_REVIEW,
        PayoutApprovalStage.CANCELLED,
      ],
      [PayoutApprovalStage.RISK_REVIEW]: [
        PayoutApprovalStage.MANUAL_REVIEW,
        PayoutApprovalStage.APPROVED,
        PayoutApprovalStage.REJECTED,
        PayoutApprovalStage.CANCELLED,
      ],
      [PayoutApprovalStage.MANUAL_REVIEW]: [
        PayoutApprovalStage.APPROVED,
        PayoutApprovalStage.REJECTED,
        PayoutApprovalStage.CANCELLED,
      ],
      [PayoutApprovalStage.APPROVED]: [PayoutApprovalStage.PROCESSING],
      [PayoutApprovalStage.REJECTED]: [],
      [PayoutApprovalStage.PROCESSING]: [
        PayoutApprovalStage.COMPLETED,
        PayoutApprovalStage.FAILED,
      ],
      [PayoutApprovalStage.COMPLETED]: [],
      [PayoutApprovalStage.FAILED]: [
        PayoutApprovalStage.REQUESTED,
        PayoutApprovalStage.CANCELLED,
      ],
      [PayoutApprovalStage.CANCELLED]: [],
    };
  }

  canAdvance(fromStage, toStage) {
    return (this.transitions[fromStage] || []).includes(toStage);
  }

  advance(currentStage, nextStage, context = {}) {
    if (!this.canAdvance(currentStage, nextStage)) {
      throw new InvalidStateTransitionError("PayoutApproval", currentStage, nextStage);
    }

    if (nextStage === PayoutApprovalStage.APPROVED && context.amount !== undefined) {
      this.financialRules.validatePayoutAmount(context.amount);
    }

    return {
      previousStage: currentStage,
      currentStage: nextStage,
      context,
      advancedAt: new Date().toISOString(),
    };
  }

  getAllowedStages(stage) {
    return [...(this.transitions[stage] || [])];
  }
}

module.exports = PayoutApprovalPipeline;
