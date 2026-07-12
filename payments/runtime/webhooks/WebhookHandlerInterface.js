/**
 * Provider-agnostic webhook handler contract — no SDK integration.
 */
class WebhookHandlerInterface {
  async verifySignature(_payload, _headers) {
    throw new Error("WebhookHandlerInterface.verifySignature must be implemented");
  }

  async handleEvent(_event) {
    throw new Error("WebhookHandlerInterface.handleEvent must be implemented");
  }
}

module.exports = WebhookHandlerInterface;
