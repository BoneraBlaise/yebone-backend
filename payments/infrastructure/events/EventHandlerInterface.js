const EventValidationError = require("./errors/EventValidationError");

/**
 * Event handler contract — subscribers must implement handle(envelope).
 */
class EventHandlerInterface {
  static assertHandler(handler) {
    if (typeof handler !== "function") {
      throw new EventValidationError("Event handler must be a function");
    }
  }

  static assertHandlerObject(handlerObject) {
    if (!handlerObject || typeof handlerObject.handle !== "function") {
      throw new EventValidationError("Handler object must expose handle(envelope)");
    }
  }

  static wrap(handler) {
    EventHandlerInterface.assertHandler(handler);
    return {
      handle: async (envelope) => handler(envelope),
    };
  }
}

module.exports = EventHandlerInterface;
