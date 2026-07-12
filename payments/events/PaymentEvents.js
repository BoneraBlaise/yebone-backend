/**
 * Base class for payment domain events.
 * Events are plain data objects — no event bus in this phase.
 */
class BasePaymentEvent {
  constructor({ type, aggregateId, payload = {}, occurredAt = new Date() }) {
    this.type = type;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}

class PaymentCreated extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "PaymentCreated", aggregateId, payload });
  }
}

class PaymentAuthorized extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "PaymentAuthorized", aggregateId, payload });
  }
}

class PaymentCaptured extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "PaymentCaptured", aggregateId, payload });
  }
}

class PaymentCancelled extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "PaymentCancelled", aggregateId, payload });
  }
}

class PaymentRefunded extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "PaymentRefunded", aggregateId, payload });
  }
}

class SubscriptionActivated extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "SubscriptionActivated", aggregateId, payload });
  }
}

class VendorPayoutQueued extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "VendorPayoutQueued", aggregateId, payload });
  }
}

class VendorPayoutCompleted extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "VendorPayoutCompleted", aggregateId, payload });
  }
}

class EscrowReleased extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "EscrowReleased", aggregateId, payload });
  }
}

class WalletCredited extends BasePaymentEvent {
  constructor(aggregateId, payload) {
    super({ type: "WalletCredited", aggregateId, payload });
  }
}

module.exports = {
  BasePaymentEvent,
  PaymentCreated,
  PaymentAuthorized,
  PaymentCaptured,
  PaymentCancelled,
  PaymentRefunded,
  SubscriptionActivated,
  VendorPayoutQueued,
  VendorPayoutCompleted,
  EscrowReleased,
  WalletCredited,
};
