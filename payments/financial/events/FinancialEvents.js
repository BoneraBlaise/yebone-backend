/**
 * Financial domain events — no event bus in this phase.
 */
class BaseFinancialEvent {
  constructor({ type, aggregateId, payload = {}, occurredAt = new Date() }) {
    this.type = type;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}

class EscrowCreated extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "EscrowCreated", aggregateId, payload });
  }
}

class EscrowReleased extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "EscrowReleased", aggregateId, payload });
  }
}

class EscrowRefunded extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "EscrowRefunded", aggregateId, payload });
  }
}

class RefundRequested extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "RefundRequested", aggregateId, payload });
  }
}

class RefundApproved extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "RefundApproved", aggregateId, payload });
  }
}

class RefundCompleted extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "RefundCompleted", aggregateId, payload });
  }
}

class VendorBalanceUpdated extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "VendorBalanceUpdated", aggregateId, payload });
  }
}

class CommissionCalculated extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "CommissionCalculated", aggregateId, payload });
  }
}

class SettlementCompleted extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "SettlementCompleted", aggregateId, payload });
  }
}

class PayoutApproved extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "PayoutApproved", aggregateId, payload });
  }
}

class WalletReserved extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "WalletReserved", aggregateId, payload });
  }
}

class WalletReleased extends BaseFinancialEvent {
  constructor(aggregateId, payload) {
    super({ type: "WalletReleased", aggregateId, payload });
  }
}

module.exports = {
  BaseFinancialEvent,
  EscrowCreated,
  EscrowReleased,
  EscrowRefunded,
  RefundRequested,
  RefundApproved,
  RefundCompleted,
  VendorBalanceUpdated,
  CommissionCalculated,
  SettlementCompleted,
  PayoutApproved,
  WalletReserved,
  WalletReleased,
};
