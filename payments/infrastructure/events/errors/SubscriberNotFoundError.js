class SubscriberNotFoundError extends Error {
  constructor(subscriberId) {
    super(`Subscriber not found: ${subscriberId}`);
    this.name = "SubscriberNotFoundError";
    this.code = "SUBSCRIBER_NOT_FOUND";
    this.subscriberId = subscriberId;
  }
}

module.exports = SubscriberNotFoundError;
