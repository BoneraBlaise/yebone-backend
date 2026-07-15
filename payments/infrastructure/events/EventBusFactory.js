const EventBus = require("./EventBus");
const EventSubscriberRegistry = require("./EventSubscriberRegistry");
const EventDispatcher = require("./EventDispatcher");
const EventBusConfig = require("./EventBusConfig");

/**
 * Factory for wiring the Module 5 event bus via DI.
 */
function createEventBus(options = {}) {
  const registry = options.registry || new EventSubscriberRegistry(options.registryOptions);
  const dispatcher = options.dispatcher || new EventDispatcher({ registry });
  const bus = new EventBus({
    registry,
    dispatcher,
    config: options.config || EventBusConfig,
    autoDispatch: options.autoDispatch,
  });

  return { bus, registry, dispatcher };
}

module.exports = createEventBus;
