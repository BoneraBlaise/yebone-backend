/**
 * Dispatches envelopes to registered subscribers in priority order.
 */
class EventDispatcher {
  constructor({ registry }) {
    if (!registry) {
      throw new Error("EventDispatcher requires a registry");
    }
    this.registry = registry;
  }

  async dispatch(envelope) {
    const handlers = this.registry.getHandlers(envelope.eventType);
    const toRemove = [];

    for (const entry of handlers) {
      await entry.handler(envelope);
      if (entry.once) {
        toRemove.push({ id: entry.id, eventType: entry.eventType });
      }
    }

    for (const item of toRemove) {
      this.registry.removeOnceHandled(item.id, item.eventType);
    }

    return handlers.length;
  }
}

module.exports = EventDispatcher;
