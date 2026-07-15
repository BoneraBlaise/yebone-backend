const crypto = require("crypto");
const EventBusConfig = require("./EventBusConfig");
const EventHandlerInterface = require("./EventHandlerInterface");
const EventValidationError = require("./errors/EventValidationError");
const SubscriberNotFoundError = require("./errors/SubscriberNotFoundError");

/**
 * In-memory subscriber registry with priority, once-only, enable/disable support.
 */
class EventSubscriberRegistry {
  constructor({ maxSubscribersPerEvent = EventBusConfig.maxSubscribersPerEvent } = {}) {
    this.maxSubscribersPerEvent = maxSubscribersPerEvent;
    this.subscribers = new Map();
  }

  subscribe(eventType, handler, options = {}) {
    EventHandlerInterface.assertHandler(handler);
    const normalizedType = this._normalizeType(eventType);
    const entry = Object.freeze({
      id: options.id || `sub_${crypto.randomUUID()}`,
      eventType: normalizedType,
      handler,
      priority: Number.isFinite(options.priority)
        ? options.priority
        : EventBusConfig.defaultHandlerPriority,
      once: options.once === true,
      enabled: options.enabled !== false,
      name: options.name || null,
      createdAt: new Date().toISOString(),
    });

    const list = this.subscribers.get(normalizedType) || [];
    if (list.length >= this.maxSubscribersPerEvent) {
      throw new EventValidationError(
        `Maximum subscribers reached for event type: ${normalizedType}`
      );
    }

    list.push(entry);
    list.sort((a, b) => a.priority - b.priority);
    this.subscribers.set(normalizedType, list);
    return entry.id;
  }

  unsubscribe(subscriberId) {
    let removed = false;
    for (const [eventType, list] of this.subscribers.entries()) {
      const filtered = list.filter((entry) => entry.id !== subscriberId);
      if (filtered.length !== list.length) {
        removed = true;
        this.subscribers.set(eventType, filtered);
      }
    }
    if (!removed) {
      throw new SubscriberNotFoundError(subscriberId);
    }
    return true;
  }

  enable(subscriberId) {
    return this._setEnabled(subscriberId, true);
  }

  disable(subscriberId) {
    return this._setEnabled(subscriberId, false);
  }

  list({ eventType, enabledOnly = false } = {}) {
    const output = [];
    const types = eventType ? [this._normalizeType(eventType)] : [...this.subscribers.keys()];
    for (const type of types) {
      const entries = this.subscribers.get(type) || [];
      for (const entry of entries) {
        if (enabledOnly && !entry.enabled) {
          continue;
        }
        output.push({
          id: entry.id,
          eventType: entry.eventType,
          priority: entry.priority,
          once: entry.once,
          enabled: entry.enabled,
          name: entry.name,
        });
      }
    }
    return output;
  }

  getHandlers(eventType) {
    const normalizedType = this._normalizeType(eventType);
    const specific = (this.subscribers.get(normalizedType) || []).filter((entry) => entry.enabled);
    const wildcard = (this.subscribers.get("*") || []).filter((entry) => entry.enabled);
    return [...specific, ...wildcard].sort((a, b) => a.priority - b.priority);
  }

  registeredEventTypes() {
    return [...this.subscribers.keys()].filter((type) => type !== "*");
  }

  count({ enabledOnly = false } = {}) {
    return this.list({ enabledOnly }).length;
  }

  removeOnceHandled(subscriberId, eventType) {
    const normalizedType = this._normalizeType(eventType);
    const list = this.subscribers.get(normalizedType) || [];
    const filtered = list.filter((entry) => entry.id !== subscriberId);
    this.subscribers.set(normalizedType, filtered);
  }

  _setEnabled(subscriberId, enabled) {
    let updated = false;
    for (const [eventType, list] of this.subscribers.entries()) {
      const next = list.map((entry) => {
        if (entry.id !== subscriberId) {
          return entry;
        }
        updated = true;
        return Object.freeze({ ...entry, enabled });
      });
      this.subscribers.set(eventType, next);
    }
    if (!updated) {
      throw new SubscriberNotFoundError(subscriberId);
    }
    return true;
  }

  _normalizeType(eventType) {
    if (eventType === "*") {
      return "*";
    }
    return String(eventType || "").trim().toUpperCase();
  }
}

module.exports = EventSubscriberRegistry;
