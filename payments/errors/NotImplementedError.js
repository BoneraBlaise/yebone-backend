/**
 * Thrown by placeholder payment providers until a real integration is added.
 */
class NotImplementedError extends Error {
  constructor(providerName, methodName) {
    super(
      `Payment provider "${providerName}" has not implemented "${methodName}" yet.`
    );
    this.name = "NotImplementedError";
    this.providerName = providerName;
    this.methodName = methodName;
  }
}

module.exports = NotImplementedError;
