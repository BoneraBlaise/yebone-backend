const createAuditFoundation = require("./AuditFactory");

module.exports = {
  AuditConfig: require("./AuditConfig"),
  AuditEvent: require("./AuditEvent"),
  ActorType: require("./AuditEvent").ActorType,
  ResourceType: require("./AuditEvent").ResourceType,
  AuditAction: require("./AuditEvent").AuditAction,
  AuditHelper: require("./AuditHelper"),
  AuditContext: require("./AuditContext"),
  AuditSanitizer: require("./AuditSanitizer"),
  AuditLog: require("./AuditLog.model"),
  AuditRepository: require("./AuditRepository"),
  AuditService: require("./AuditService"),
  AuditFactory: createAuditFoundation,
  createAuditFoundation,
  ImmutableAuditError: require("./errors/ImmutableAuditError"),
};
