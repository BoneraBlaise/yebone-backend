const { v1 } = require("../../api/versioning");
const WebhookRequestContext = require("./WebhookRequestContext");
const RuntimeExecutionGuardError = require("../../infrastructure/providers/runtime/errors/RuntimeExecutionGuardError");

/**
 * Webhook route adapter — mounted when enableWebhooks and handlers are registered.
 */
class WebhookRouter {
  constructor({ registry, logger, config }) {
    this.registry = registry;
    this.logger = logger;
    this.config = config || {};
    this.prefix = `${v1.basePath}/webhooks`;
  }

  getDefinitions() {
    return [
      {
        method: "POST",
        path: "/webhooks/:providerCode",
        fullPath: `${this.prefix}/:providerCode`,
        handler: async (req, res, next) => {
          const context = WebhookRequestContext.fromHttpRequest(req, this.config);

          try {
            const handler = this.registry.get(context.providerCode);
            if (!handler) {
              this.logger?.warn("Webhook handler not found", {
                providerCode: context.providerCode,
                correlationId: context.correlationId,
              });
              return res.status(404).json({
                success: false,
                correlationId: context.correlationId,
                error: {
                  code: "WEBHOOK_HANDLER_NOT_FOUND",
                  message: "Webhook handler not registered",
                },
              });
            }

            this.logger?.info("Webhook received", {
              providerCode: context.providerCode,
              correlationId: context.correlationId,
            });

            const signatureResult = await handler.verifySignature(
              {
                payload: context.payload,
                payloadMaterial: context.payloadMaterial,
                headers: context.headers,
                signature: context.signature,
                correlationId: context.correlationId,
              },
              context.headers
            );

            const result = await handler.handleEvent({
              payload: context.payload,
              payloadMaterial: context.payloadMaterial,
              headers: context.headers,
              signature: context.signature,
              correlationId: context.correlationId,
            });

            const accepted = result?.accepted === true;
            const statusCode = accepted || result?.verification?.mock ? 202 : 202;

            this.logger?.info("Webhook processed", {
              providerCode: context.providerCode,
              correlationId: context.correlationId,
              accepted,
              executionMode: result?.executionMode,
              verificationStatus: result?.status,
            });

            return res.status(statusCode).json({
              success: true,
              correlationId: context.correlationId,
              data: Object.freeze({
                accepted,
                providerCode: context.providerCode,
                executionMode: result?.executionMode || null,
                verificationStatus: result?.status || signatureResult?.status || null,
                mock: Boolean(result?.verification?.mock || signatureResult?.mock),
                result,
              }),
            });
          } catch (error) {
            if (error instanceof RuntimeExecutionGuardError) {
              this.logger?.warn("Webhook guard rejection", {
                providerCode: context.providerCode,
                correlationId: context.correlationId,
                code: error.code,
              });
              return res.status(403).json({
                success: false,
                correlationId: context.correlationId,
                error: {
                  code: error.code || "RUNTIME_GUARD_REJECTED",
                  message: "Webhook execution blocked by runtime guard",
                },
              });
            }

            this.logger?.error("Webhook processing failed", {
              providerCode: context.providerCode,
              correlationId: context.correlationId,
              message: error?.message,
            });
            return next(error);
          }
        },
      },
    ];
  }
}

module.exports = WebhookRouter;
