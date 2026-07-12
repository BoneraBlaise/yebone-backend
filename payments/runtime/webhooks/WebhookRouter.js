const { v1 } = require("../../api/versioning");

/**
 * Webhook route adapter — not registered until providers are integrated.
 */
class WebhookRouter {
  constructor({ registry, logger }) {
    this.registry = registry;
    this.logger = logger;
    this.prefix = `${v1.basePath}/webhooks`;
  }

  getDefinitions() {
    return [
      {
        method: "POST",
        path: "/:providerCode",
        fullPath: `${this.prefix}/:providerCode`,
        handler: async (req, res, next) => {
          try {
            const handler = this.registry.get(req.params.providerCode);
            if (!handler) {
              return res.status(404).json({
                success: false,
                error: { code: "WEBHOOK_HANDLER_NOT_FOUND", message: "Webhook handler not registered" },
              });
            }
            await handler.verifySignature(req.body, req.headers);
            const result = await handler.handleEvent(req.body);
            return res.status(202).json({ success: true, data: { accepted: true, result } });
          } catch (error) {
            return next(error);
          }
        },
      },
    ];
  }
}

module.exports = WebhookRouter;
