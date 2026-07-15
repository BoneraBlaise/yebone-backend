/**
 * Audit foundation configuration.
 */
const AuditConfig = {
  collectionName: "payment_audit_logs",
  auditIdPrefix: "aud",
  defaultActorType: "SYSTEM",
  defaultActorId: "system",
  maxPayloadDepth: 5,
  maxPayloadBytes: 8192,
};

module.exports = AuditConfig;
