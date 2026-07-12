/**
 * Centralized marketplace financial policy rules.
 */
class FinancialRules {
  constructor(options = {}) {
    this.minimumPayout = options.minimumPayout ?? 25;
    this.maximumPayout = options.maximumPayout ?? 50000;
    this.escrowReleaseDelayHours = options.escrowReleaseDelayHours ?? 72;
    this.refundWindowDays = options.refundWindowDays ?? 14;
    this.minimumCommissionRate = options.minimumCommissionRate ?? 0.05;
    this.maximumCommissionRate = options.maximumCommissionRate ?? 0.35;
    this.minimumWalletBalance = options.minimumWalletBalance ?? 0;
    this.maximumWalletBalance = options.maximumWalletBalance ?? 1000000;
    this.allowNegativeBalance = options.allowNegativeBalance ?? false;
    this.allowPartialRefund = options.allowPartialRefund ?? true;
    this.subscriptionPriorityMultiplier = options.subscriptionPriorityMultiplier ?? 0.85;
    this.defaultCommissionRate = options.defaultCommissionRate ?? 0.1;
    this.defaultFixedFee = options.defaultFixedFee ?? 0;
  }

  validatePayoutAmount(amount) {
    if (amount < this.minimumPayout) {
      throw new Error(`Payout amount must be at least ${this.minimumPayout}`);
    }
    if (amount > this.maximumPayout) {
      throw new Error(`Payout amount cannot exceed ${this.maximumPayout}`);
    }
    return true;
  }

  validateCommissionRate(rate) {
    if (rate < this.minimumCommissionRate || rate > this.maximumCommissionRate) {
      throw new Error(
        `Commission rate must be between ${this.minimumCommissionRate} and ${this.maximumCommissionRate}`
      );
    }
    return true;
  }

  validateWalletBalance(balance) {
    if (!this.allowNegativeBalance && balance < this.minimumWalletBalance) {
      throw new Error("Wallet balance cannot be negative");
    }
    if (balance > this.maximumWalletBalance) {
      throw new Error(`Wallet balance exceeds maximum ${this.maximumWalletBalance}`);
    }
    return true;
  }

  canPartialRefund(requestedAmount, paidAmount) {
    if (!this.allowPartialRefund && requestedAmount < paidAmount) {
      return false;
    }
    return requestedAmount > 0 && requestedAmount <= paidAmount;
  }

  isWithinRefundWindow(orderCompletedAt, now = new Date()) {
    const windowMs = this.refundWindowDays * 24 * 60 * 60 * 1000;
    return now.getTime() - new Date(orderCompletedAt).getTime() <= windowMs;
  }

  escrowReleaseEligible(heldAt, now = new Date()) {
    const delayMs = this.escrowReleaseDelayHours * 60 * 60 * 1000;
    return now.getTime() - new Date(heldAt).getTime() >= delayMs;
  }
}

module.exports = FinancialRules;
