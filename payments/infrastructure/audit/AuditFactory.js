const AuditRepository = require("./AuditRepository");
const AuditService = require("./AuditService");

/**
 * Factory for wiring the Module 3 audit foundation via DI.
 * Not auto-wired into PaymentModule or routes.
 */
function createAuditFoundation(options = {}) {
  const repository = options.repository || new AuditRepository();
  const service = new AuditService({
    repository,
    sanitizer: options.sanitizer,
  });
  return { repository, service };
}

module.exports = createAuditFoundation;
