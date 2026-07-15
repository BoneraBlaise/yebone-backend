/**
 * Payment Domain Event Bus configuration.
 * In-process only — no external messaging systems.
 */
const EventBusConfig = {
  version: "5.0.0-foundation",
  envelopeVersion: "1.0",
  defaultAggregateType: "PAYMENT",
  maxQueueSize: 10000,
  maxSubscribersPerEvent: 256,
  defaultHandlerPriority: 100,
};

module.exports = EventBusConfig;
