const {
  CommissionCalculated,
  SettlementCompleted,
  EscrowCreated,
  VendorBalanceUpdated,
} = require("../events/FinancialEvents");
const EscrowState = require("../state-machines/EscrowState");

/**
 * Orchestrates fund distribution across marketplace parties.
 * Calculation and journal entries only — no payment provider calls.
 */
class SettlementEngine {
  constructor({
    paymentService,
    commissionEngine,
    deliverySettlementEngine,
    vendorBalanceEngine,
    accountingLedger,
    financialRules,
    auditService,
    escrowStateMachine,
  }) {
    this.paymentService = paymentService;
    this.commissionEngine = commissionEngine;
    this.deliverySettlementEngine = deliverySettlementEngine;
    this.vendorBalanceEngine = vendorBalanceEngine;
    this.accountingLedger = accountingLedger;
    this.financialRules = financialRules;
    this.auditService = auditService;
    this.escrowStateMachine = escrowStateMachine;
  }

  _journalId(prefix, referenceId) {
    return `${prefix}_${referenceId}_${Date.now()}`;
  }

  /**
   * Distribute order funds between customer, vendor, platform, delivery, and escrow.
   */
  settleOrder({
    orderId,
    orderSubtotal,
    deliveryFee,
    vendorId,
    commissionInput = {},
    deliveryInput = {},
    vendorBalanceInput = {},
  }) {
    const commission = this.commissionEngine.calculate({
      orderSubtotal,
      ...commissionInput,
    });

    const delivery = this.deliverySettlementEngine.calculate({
      deliveryFee,
      ...deliveryInput,
    });

    const vendorBalance = this.vendorBalanceEngine.calculateEarningsBreakdown({
      pendingEarnings: commission.vendorAmount,
      escrowEarnings: orderSubtotal,
      ...vendorBalanceInput,
    });

    const escrowState = EscrowState.CREATED;
    this.escrowStateMachine.transition(escrowState, EscrowState.AUTHORIZED);
    const heldState = this.escrowStateMachine.transition(EscrowState.AUTHORIZED, EscrowState.HELD);

    const journalId = this._journalId("settle", orderId);

    this.accountingLedger.recordOrderPayment({
      journalId,
      reference: orderId,
      amount: orderSubtotal + deliveryFee,
    });

    this.accountingLedger.recordCommission({
      journalId: `${journalId}_commission`,
      reference: orderId,
      amount: commission.platformAmount,
    });

    if (delivery.platformShare > 0) {
      this.accountingLedger.recordDeliveryRevenue({
        journalId: `${journalId}_delivery`,
        reference: orderId,
        amount: delivery.platformShare,
      });
    }

    const events = [
      new EscrowCreated(orderId, { state: heldState, amount: orderSubtotal }),
      new CommissionCalculated(orderId, commission),
      new VendorBalanceUpdated(vendorId, vendorBalance),
      new SettlementCompleted(orderId, {
        commission,
        delivery,
        vendorBalance,
        totals: {
          customerPaid: orderSubtotal + deliveryFee,
          vendorReceivable: commission.vendorAmount,
          platformReceivable: commission.platformAmount + delivery.platformShare,
          deliveryPool: delivery.deliveryFee,
        },
      }),
    ];

    this.auditService.recordSettlement("order_settled", orderId, {
      commission,
      delivery,
      vendorBalance,
    });

    return {
      orderId,
      escrowState: heldState,
      commission,
      delivery,
      vendorBalance,
      events,
      journals: this.accountingLedger.getJournals().slice(-3),
    };
  }
}

module.exports = SettlementEngine;
