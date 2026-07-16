const ProviderErrorMapper = require("../ProviderErrorMapper");

/**
 * MTN MoMo-specific error mapping.
 */
class MTNMoMoErrorMapper extends ProviderErrorMapper {
  mapMtnBody(body, context = {}) {
    const code = body?.code || body?.error || "MTN_MOMO_ERROR";
    const message = body?.message || body?.error_description || "MTN MoMo provider error";
    return this.mapHttpStatus(body?.statusCode || 400, { message, code }, context);
  }
}

module.exports = MTNMoMoErrorMapper;
