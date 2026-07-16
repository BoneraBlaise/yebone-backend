const ProviderErrorMapper = require("../ProviderErrorMapper");

/**
 * Paypack-specific error mapping.
 */
class PaypackErrorMapper extends ProviderErrorMapper {
  mapPaypackBody(body, context = {}) {
    const message = body?.message || body?.error || "Paypack provider error";
    return this.mapHttpStatus(body?.status || 400, { message }, context);
  }
}

module.exports = PaypackErrorMapper;
