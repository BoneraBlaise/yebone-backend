const EventBusConfig = require("./EventBusConfig");
const EventEnvelope = require("./EventEnvelope");
const EventSubscriberRegistry = require("./EventSubscriberRegistry");
const EventDispatcher = require("./EventDispatcher");
const EventQueueFullError = require("./errors/EventQueueFullError");

/**
 * In-process Payment Domain Event Bus — publish/subscribe/dispatch only.
 */
class EventBus {
  constructor({ registry, dispatcher, config = EventBusConfig, autoDispatch = true } = {}) {
    this.config = config;
    this.registry = registry || new EventSubscriberRegistry();
    this.dispatcher = dispatcher || new EventDispatcher({ registry: this.registry });
    this.autoDispatch = autoDispatch !== false;
    this.queue = [];
    this.publishedEvents = 0;
    this.dispatchedEvents = 0;
  }

  async publish(input = {}) {
    const envelope = EventEnvelope.create(input);
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new EventQueueFullError(this.config.maxQueueSize);
    }

    this.queue.push(envelope);
    this.publishedEvents += 1;

    if (this.autoDispatch) {
      await this.dispatch(envelope.eventId);
    }

    return envelope.eventId;
  }

  subscribe(eventType, handler, options = {}) {
    return this.registry.subscribe(eventType, handler, options);
  }

  unsubscribe(subscriberId) {
    return this.registry.unsubscribe(subscriberId);
  }

  async dispatch(eventId = null) {
    if (eventId) {
      const index = this.queue.findIndex((entry) => entry.eventId === eventId);
      if (index === -1) {
        return 0;
      }
      const [envelope] = this.queue.splice(index, 1);
      const handlerCount = await this.dispatcher.dispatch(envelope);
      this.dispatchedEvents += 1;
      return handlerCount;
    }

    let totalHandlers = 0;
    while (this.queue.length > 0) {
      const envelope = this.queue.shift();
      totalHandlers += await this.dispatcher.dispatch(envelope);
      this.dispatchedEvents += 1;
    }
    return totalHandlers;
  }

  inspect() {
    return Object.freeze({
      queuedEvents: this.queue.map((entry) => ({
        eventId: entry.eventId,
        eventType: entry.eventType,
        aggregateId: entry.aggregateId,
        timestamp: entry.timestamp.toISOString(),
      })),
      subscribers: this.registry.list(),
      registeredEvents: this.registry.registeredEventTypes(),
      publishedEvents: this.publishedEvents,
      dispatchedEvents: this.dispatchedEvents,
    });
  }

  health() {
    const subscribers = this.registry.list();
    const enabledSubscribers = this.registry.list({ enabledOnly: true });
    return Object.freeze({
      healthy: true,
      subscribers: subscribers.length,
      registeredEvents: this.registry.registeredEventTypes(),
      enabledSubscribers: enabledSubscribers.length,
      version: this.config.version,
      queuedEvents: this.queue.length,
      publishedEvents: this.publishedEvents,
      checkedAt: new Date().toISOString(),
    });
  }

  enableSubscriber(subscriberId) {
    return this.registry.enable(subscriberId);
  }

  disableSubscriber(subscriberId) {
    return this.registry.disable(subscriberId);
  }

  listSubscribers(options) {
    return this.registry.list(options);
  }
}

module.exports = EventBus;
