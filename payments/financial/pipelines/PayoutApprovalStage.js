/**
 * Payout approval pipeline stages.
 */
const PayoutApprovalStage = Object.freeze({
  REQUESTED: "REQUESTED",
  RISK_REVIEW: "RISK_REVIEW",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

module.exports = PayoutApprovalStage;
