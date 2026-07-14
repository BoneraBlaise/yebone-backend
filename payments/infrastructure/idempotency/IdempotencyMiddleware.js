const IdempotencyHelper = require("./IdempotencyHelper");
const IdempotencyConfig = require("./IdempotencyConfig");

/**
 * Express middleware — extracts idempotency context from headers.
 * Does not execute payment logic; attaches context for downstream handlers.
 */
class IdempotencyMiddleware {
  static attach(options = {}) {
    const {
      requireKey = false,
      scope = null,
      headerName = IdempotencyConfig.headers.idempotencyKey,
    } = options;

    return (req, res, next) => {
      try {
        const context = IdempotencyHelper.extractContext(req, { requireKey });
        req.idempotencyContext = {
          ...context,
          scope,
        };
        if (context.correlationId) {
          res.setHeader(IdempotencyConfig.headers.correlationId, context.correlationId);
        }
        if (context.requestId) {
          res.setHeader(IdempotencyConfig.headers.requestId, context.requestId);
        }
        return next();
      } catch (error) {
        return res.status(error.statusCode || 400).json({
          success: false,
          code: error.code || "IDEMPOTENCY_CONTEXT_ERROR",
          message: error.message,
        });
      }
    };
  }

  /**
   * Resolve the effective idempotency key for a request.
   * Prefers header key, falls back to explicit body field.
   */
  static resolveKey(req, fallbackKey = null) {
    const fromContext = req?.idempotencyContext?.idempotencyKey;
    const fromBody = req?.body?.idempotencyKey;
    const key = fromContext || fromBody || fallbackKey;
    return key ? IdempotencyHelper.normalizeKey(key) : null;
  }
}

module.exports = IdempotencyMiddleware;
