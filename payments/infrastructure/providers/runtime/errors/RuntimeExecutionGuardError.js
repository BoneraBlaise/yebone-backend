class RuntimeExecutionGuardError extends Error {
  constructor(message, { code, providerCode, environment } = {}) {
    super(message);
    this.name = "RuntimeExecutionGuardError";
    this.code = code || "RUNTIME_GUARD_VIOLATION";
    this.providerCode = providerCode || null;
    this.environment = environment || null;
  }
}

module.exports = RuntimeExecutionGuardError;
