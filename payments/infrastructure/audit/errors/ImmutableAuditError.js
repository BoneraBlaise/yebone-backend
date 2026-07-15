class ImmutableAuditError extends Error {
  constructor(message = "Audit records are immutable and cannot be modified or deleted") {
    super(message);
    this.name = "ImmutableAuditError";
    this.code = "AUDIT_IMMUTABLE";
  }
}

module.exports = ImmutableAuditError;
